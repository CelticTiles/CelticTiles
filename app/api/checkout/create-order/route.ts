import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createServerSupabase } from "@/lib/supabase/server"
import { getServerSession } from "@/lib/loaders"
import {
  buildSecureCheckoutSnapshot,
  deductStockForOrderItems,
  generateSecureOrderNumber,
  incrementCouponUsage,
} from "@/lib/secure-checkout"
import { sendAdminNewOrderNotification } from "@/lib/email"
import type { Database } from "@/supabase/database.types"


type PaymentMethod = "card" | "offline_cash" | "card_instore" | "bank_transfer"

interface CreateOrderRequestBody {
  stripeSessionId?: string
  paymentMethod?: PaymentMethod
  couponCode?: string | null
  customer?: {
    full_name?: string
    email?: string
    phone?: string
  }
  deliveryAddress?: {
    street?: string
    city?: string
    state?: string
    pincode?: string
    country?: string
  }
}

type DeliveryAddress = {
  street: string
  city: string
  state: string
  pincode: string
  country: string
}

type StatusHistoryEntry = {
  status: string
  timestamp: string
  updated_by: string
  note: string
}

type OrderInsertWithStripe = Database["public"]["Tables"]["orders"]["Insert"] & {
  stripe_session_id?: string | null
  status_history: Database["public"]["Tables"]["orders"]["Insert"]["status_history"]
  delivery_address: Database["public"]["Tables"]["orders"]["Insert"]["delivery_address"]
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return ""
  return value.trim().slice(0, maxLength)
}

function parseBody(body: unknown): CreateOrderRequestBody {
  if (!body || typeof body !== "object") return {}
  return body as CreateOrderRequestBody
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createServerSupabase()

    const body = parseBody(await request.json().catch(() => null))
    const rawMethod = (body as any).paymentMethod
    const paymentMethod: PaymentMethod =
      rawMethod === "offline_cash" ? "offline_cash"
      : rawMethod === "card_instore" ? "card_instore"
      : rawMethod === "bank_transfer" ? "bank_transfer"
      : "card"
    const stripeSessionId = cleanText(body.stripeSessionId, 255)

    if ((paymentMethod === "offline_cash" || paymentMethod === "card_instore" || paymentMethod === "bank_transfer") && session.userRole !== "admin" && session.userRole !== "sales") {
      return NextResponse.json({ error: "This payment method is staff-only" }, { status: 403 })
    }

    if (paymentMethod === "card" && !stripeSessionId) {
      return NextResponse.json({ error: "Missing Stripe session id" }, { status: 400 })
    }

    const fullName = cleanText(body.customer?.full_name, 120)
    const emailInput = cleanText(body.customer?.email, 160).toLowerCase()
    const phone = cleanText(body.customer?.phone, 40)

    const street = cleanText(body.deliveryAddress?.street, 200)
    const city = cleanText(body.deliveryAddress?.city, 120)
    const state = cleanText(body.deliveryAddress?.state, 120)
    const pincode = cleanText(body.deliveryAddress?.pincode, 40)
    const country = cleanText(body.deliveryAddress?.country, 80) || "Ireland"

    if (!fullName || !phone || !street || !city || !state || !pincode) {
      return NextResponse.json({ error: "Missing required checkout fields" }, { status: 400 })
    }

    const authoritativeEmail = session.userEmail?.toLowerCase() || emailInput
    if (!authoritativeEmail || !EMAIL_REGEX.test(authoritativeEmail)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 })
    }

    const isOfflinePayment = paymentMethod === "offline_cash" || paymentMethod === "card_instore" || paymentMethod === "bank_transfer"
    const isQuoteMode = !!(body as any).quoteId && !!(body as any).quoteSnapshot

    // Quote mode: always use the passed quote snapshot — no cart lookup needed
    const snapshot = isQuoteMode
      ? (body as any).quoteSnapshot
      : await buildSecureCheckoutSnapshot(supabase, session.userId, body.couponCode)

    let orderNumber = generateSecureOrderNumber()

    if (paymentMethod === "card") {
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY
      if (!stripeSecretKey) {
        return NextResponse.json({ error: "Stripe is not configured" }, { status: 500 })
      }

      const stripe = new Stripe(stripeSecretKey)
      const stripeSession = await stripe.checkout.sessions.retrieve(stripeSessionId)

      const stripeUserId = cleanText(stripeSession.metadata?.userId, 255)
      const stripeOrderNumber = cleanText(stripeSession.metadata?.orderId, 255)
      const stripeAmount = stripeSession.amount_total ?? 0
      const expectedAmount = Math.round(snapshot.total * 100)

      if (!stripeOrderNumber || stripeUserId !== session.userId) {
        return NextResponse.json({ error: "Invalid Stripe session ownership" }, { status: 403 })
      }

      if (stripeAmount !== expectedAmount) {
        return NextResponse.json({ error: "Order total mismatch" }, { status: 400 })
      }

      orderNumber = stripeOrderNumber

      // Cancel older pending card orders for this user so stale sessions do not linger.
      const staleOrderUpdate: Database["public"]["Tables"]["orders"]["Update"] = {
        status: "Cancelled",
        payment_status: "Cancelled",
        updated_at: new Date().toISOString(),
      }

      await supabase
        .from("orders")
        .update(staleOrderUpdate)
        .eq("user_id", session.userId)
        .eq("payment_method", "card")
        .eq("payment_status", "Pending")
        .neq("stripe_session_id", stripeSessionId)
    }

    const statusHistory: StatusHistoryEntry[] = [
      {
        status: "Pending",
        timestamp: new Date().toISOString(),
        updated_by: session.userName || "system",
        note:
      paymentMethod === "offline_cash"
            ? "Cash payment - paid in store"
            : paymentMethod === "card_instore"
            ? "Card payment - paid via in-store machine"
            : paymentMethod === "bank_transfer"
            ? "Bank transfer - payment received"
            : "Card payment - awaiting verification",
      },
    ]

    const orderPayload: OrderInsertWithStripe = {
      user_id: session.userId,
      customer_id: session.userId,
      customer_name: fullName,
      customer_email: authoritativeEmail,
      customer_phone: phone,
      subtotal: snapshot.subtotal,
      tax: snapshot.tax,
      shipping_fee: snapshot.shipping_fee,
      discount: snapshot.discount,
      coupon_code: snapshot.coupon_code,
      total: snapshot.total,
      status: "Pending",
      payment_method: paymentMethod,
      payment_status: "Pending",
      delivery_address: JSON.parse(
        JSON.stringify({ street, city, state, pincode, country } satisfies DeliveryAddress)
      ) as Database["public"]["Tables"]["orders"]["Insert"]["delivery_address"],
      items: JSON.parse(
        JSON.stringify(snapshot.items)
      ) as Database["public"]["Tables"]["orders"]["Insert"]["items"],
      status_history: JSON.parse(
        JSON.stringify(statusHistory)
      ) as Database["public"]["Tables"]["orders"]["Insert"]["status_history"],
      order_number: orderNumber,
      stripe_session_id: paymentMethod === "card" ? stripeSessionId : null,
      source: "web",
    }

    const { data, error } = await supabase
      .from("orders")
      .insert(orderPayload)
      .select("*")
      .single()

    if (error || !data) {
      console.error("[create-order] Insert error:", error)
      return NextResponse.json({ error: error?.message || "Failed to create order" }, { status: 500 })
    }


    // ✅ Notify Admin about new order (non-blocking)
    sendAdminNewOrderNotification({
      customerName: fullName,
      orderNumber: orderNumber,
      total: snapshot.total,
    }).catch(err => console.error('[Email] Admin notification failed:', err))

    // ✅ NEW: If this order came from a quotation, mark the quotation as accepted

    if (isQuoteMode && (body as any).quoteId) {
      const quoteId = (body as any).quoteId
      try {
        // Fetch quote to get lead_id
        const { data: quote } = await supabase
          .from("quotations")
          .select("lead_id, quote_number")
          .eq("id", quoteId)
          .single()

        await supabase
          .from("quotations")
          .update({ 
            status: "accepted", 
            updated_at: new Date().toISOString() 
          })
          .eq("id", quoteId)
          
        console.log(`[create-order] ✅ Quotation ${quoteId} marked as accepted`)

        // ✅ Sync with CRM: Update lead status to 'Converted'
        if (quote?.lead_id) {
          await supabase
            .from("leads")
            .update({ status: "Converted" })
            .eq("id", quote.lead_id)

          await supabase.from("activity_logs").insert({
            lead_id: quote.lead_id,
            action: "order_created",
            note: `Order ${orderNumber} created from storefront checkout (Quote ${quote.quote_number})`,
            performed_by: session.userId,
          })
          console.log(`[create-order] ✅ CRM lead ${quote.lead_id} updated to Converted`)
        }
      } catch (quoteErr) {
        console.warn("[create-order] Failed to update quotation/lead status (non-blocking):", quoteErr)
      }
    }


    if (paymentMethod === "offline_cash" || paymentMethod === "card_instore" || paymentMethod === "bank_transfer") {
      await deductStockForOrderItems(supabase, snapshot.items)
    }

    await incrementCouponUsage(supabase, snapshot.coupon_code)

    return NextResponse.json({ order: data }, { status: 201 })
  } catch (err: unknown) {
    console.error("[create-order] Unexpected error:", err)
    return NextResponse.json({ error: getErrorMessage(err, "Server error") }, { status: 500 })
  }
}
