import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getServerSession } from "@/lib/loaders"
import { createServerSupabase } from "@/lib/supabase/server"
import { buildSecureCheckoutSnapshot, generateSecureOrderNumber } from "@/lib/secure-checkout"

interface CreateStripeSessionBody {
  couponCode?: string | null
  quoteId?: string | null
  quoteSnapshot?: {
    total: number
    items: any[]
    subtotal: number
    discount: number
    coupon_code: string | null
  } | null
}

function parseBody(body: unknown): CreateStripeSessionBody {
  if (!body || typeof body !== "object") return {}
  return body as CreateStripeSessionBody
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    if (!stripeSecretKey) {
      return NextResponse.json({ error: "Stripe is not configured" }, { status: 500 })
    }

    const body = parseBody(await req.json().catch(() => null))
    const isQuoteMode = !!(body.quoteId && body.quoteSnapshot)

    let amount: number
    let orderNumber: string

    if (isQuoteMode) {
      // Quote mode: use the quote total directly — no cart lookup needed
      amount = Number(body.quoteSnapshot!.total)
      orderNumber = generateSecureOrderNumber()
    } else {
      // Normal cart mode: build snapshot from user's DB cart
      const supabase = await createServerSupabase()
      const snapshot = await buildSecureCheckoutSnapshot(supabase, session.userId, body?.couponCode)
      amount = snapshot.total
      orderNumber = generateSecureOrderNumber()
    }

    if (amount < 0.1 || amount > 50000) {
      return NextResponse.json({ error: "Invalid order amount" }, { status: 400 })
    }

    const stripe = new Stripe(stripeSecretKey)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || req.nextUrl.origin

    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Celtic Tiles Order",
              description: `Order #${orderNumber}`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${baseUrl}/order/success?orderId=${orderNumber}`,
      cancel_url: `${baseUrl}/checkout`,
      customer_email: session.userEmail ?? undefined,
      locale: "auto",
      billing_address_collection: "required",
      shipping_address_collection: {
        allowed_countries: ["IE"],
      },
      metadata: {
        orderId: orderNumber,
        userId: session.userId,
        couponCode: isQuoteMode ? "" : ((body as any).snapshot?.coupon_code ?? ""),
      },
      payment_intent_data: {
        metadata: {
          orderId: orderNumber,
          userId: session.userId,
        },
      },
    })

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
      orderNumber,
      total: amount,
    })
  } catch (error: unknown) {
    console.error("Stripe session creation error:", error)
    return NextResponse.json({ error: getErrorMessage(error, "Failed to create payment session") }, { status: 500 })
  }
}
