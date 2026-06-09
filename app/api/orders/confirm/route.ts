import { NextRequest, NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { sendOrderStatusEmail } from "@/lib/email"

import { getServerSession } from "@/lib/loaders"
import type { Database } from "@/lib/supabase-types"
import { generateOrderInvoicePdfBuffer } from "@/lib/order-invoice-pdf"
import type { Json } from "@/supabase/database.types"

type ConfirmOrderRequestBody = { orderNumber?: string }
type ConfirmOrderRow = Pick<
  Database["public"]["Tables"]["orders"]["Row"],
  | "id"
  | "order_number"
  | "total"
  | "customer_name"
  | "customer_email"
  | "customer_phone"
  | "user_id"
  | "customer_id"
  | "payment_method"
  | "payment_status"
  | "created_at"
  | "items"
  | "delivery_address"
  | "subtotal"
  | "tax"
  | "discount"
  | "shipping_fee"
  | "invoice_file_id"
  | "email_sent"
  | "paid_amount"
  | "source"
>

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type InvoiceItem = {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  subtotal: number
  vat_rate?: number
  sku?: string
}

function normalizeOrderItems(raw: Json, skuMap: Record<string, string> = {}): InvoiceItem[] {
  if (!Array.isArray(raw)) return []

  return (raw
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null
      const source = item as Record<string, unknown>
      const quantity = Number(source.quantity ?? 0)
      const unitPrice = Number(source.unit_price ?? source.price ?? 0)
      const subtotal = Number(source.subtotal ?? unitPrice * quantity)
      const productId = String(source.product_id ?? "")

      // Resolve vat_rate: only use a stored value if it's a positive number.
      // Cart-based orders have no vat_rate on items, so we pass undefined to let
      // the PDF generator apply its 23% Irish VAT fallback.
      const rawVatRate = source.vat_rate ?? source.vatRate
      const parsedVatRate =
        rawVatRate !== undefined && rawVatRate !== null ? Number(rawVatRate) : undefined

      return {
        product_id: productId,
        product_name: String(source.product_name ?? "Item"),
        quantity: Number.isFinite(quantity) ? quantity : 0,
        unit_price: Number.isFinite(unitPrice) ? unitPrice : 0,
        subtotal: Number.isFinite(subtotal) ? subtotal : 0,
        vat_rate: parsedVatRate !== undefined && parsedVatRate > 0 ? parsedVatRate : undefined,
        sku: String(source.sku ?? source.assigned_code ?? skuMap[productId] ?? "") || undefined,
      } as InvoiceItem
    })
    .filter((item) => Boolean(item && item.product_id && item.quantity > 0))) as InvoiceItem[]
}


function normalizeDeliveryAddress(raw: Json) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
  const source = raw as Record<string, unknown>

  return {
    street: typeof source.street === "string" ? source.street : "",
    city: typeof source.city === "string" ? source.city : "",
    state: typeof source.state === "string" ? source.state : "",
    pincode: typeof source.pincode === "string" ? source.pincode : "",
    country: typeof source.country === "string" ? source.country : "",
  }
}

async function ensureInvoicePdf(order: ConfirmOrderRow, supabase: Awaited<ReturnType<typeof createServerSupabase>>) {
  const invoicePath = `orders/${order.order_number}/${order.order_number}.pdf`

  // Build sku map: look up assigned_code for all UUID product IDs in this order
  const skuMap: Record<string, string> = {}
  if (Array.isArray(order.items)) {
    const uuidProductIds = (order.items as any[])
      .map((i: any) => i?.product_id)
      .filter((pid: string) => typeof pid === "string" && UUID_PATTERN.test(pid))

    if (uuidProductIds.length > 0) {
      const { data: products } = await (supabase as any)
        .from("products")
        .select("id, assigned_code")
        .in("id", uuidProductIds)

      if (products) {
        for (const p of products as Array<{ id: string; assigned_code: string | null }>) {
          if (p.assigned_code) skuMap[p.id] = p.assigned_code
        }
      }
    }
  }

  const pdfBuffer = await generateOrderInvoicePdfBuffer({
    order_number: order.order_number,
    created_at: order.created_at,
    customer_name: order.customer_name,
    payment_method: order.payment_method,
    subtotal: Number(order.subtotal ?? 0),
    tax: Number(order.tax ?? 0),
    discount: Number(order.discount ?? 0),
    shipping_fee: Number(order.shipping_fee ?? 0),
    total: Number(order.total ?? 0),
    items: normalizeOrderItems(order.items as Json, skuMap),
    delivery_address: normalizeDeliveryAddress(order.delivery_address as Json),
    acc_ref: "",
    sales_rep: "WEB",
    paid_amount: Number(order.paid_amount ?? 0),
    source: order.source || "cart",
  })

  const uploadResult = await supabase.storage
    .from("uploads")
    .upload(invoicePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    })

  if (uploadResult.error) {
    throw new Error(`Failed to upload invoice PDF: ${uploadResult.error.message}`)
  }

  if (order.invoice_file_id !== invoicePath) {
    await supabase
      .from("orders")
      .update({ invoice_file_id: invoicePath, updated_at: new Date().toISOString() })
      .eq("id", order.id)
  }

  return { path: invoicePath, buffer: pdfBuffer }
}

function parseBody(body: unknown): ConfirmOrderRequestBody {
  if (!body || typeof body !== "object") return {}
  return body as ConfirmOrderRequestBody
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

/**
 * POST /api/orders/confirm
 * Sends "order placed" email for the authenticated user's order.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = parseBody(await request.json().catch(() => null))
    const orderNumber = typeof body?.orderNumber === "string" ? body.orderNumber.trim() : ""

    if (!orderNumber) {
      return NextResponse.json({ error: "Missing orderNumber" }, { status: 400 })
    }

    const supabase = await createServerSupabase()
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id, order_number, total, customer_name, customer_email, customer_phone, user_id, customer_id, payment_method, payment_status, created_at, items, delivery_address, subtotal, tax, discount, shipping_fee, invoice_file_id, email_sent, paid_amount, source")
      .eq("order_number", orderNumber)
      .eq("user_id", session.userId)
      .maybeSingle()

    if (fetchError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }
    const typedOrder = order as any

    if (!typedOrder.customer_email) {
      return NextResponse.json({ error: "No customer email" }, { status: 400 })
    }

    const invoice = await ensureInvoicePdf(typedOrder, supabase)

    if (typedOrder.email_sent) {
      return NextResponse.json({
        success: true,
        email: { alreadySent: true },
        invoice: { path: invoice.path },
      })
    }

    const emailResult = await sendOrderStatusEmail({
      customerName: typedOrder.customer_name,
      customerEmail: typedOrder.customer_email,
      orderNumber: typedOrder.order_number,
      status: "Placed",
      total: typedOrder.total,
      attachments: [
        {
          filename: `${typedOrder.order_number}.pdf`,
          content: invoice.buffer,
          contentType: "application/pdf",
        },
      ],
    })

    if (!emailResult.success) {

      console.warn(`[Email] ❌ Failed to send email for order ${typedOrder.order_number}:`, emailResult.error)
      return NextResponse.json({
        success: false,
        email: { sent: false, error: emailResult.error },
        invoice: { path: invoice.path },
      })
    }

    await supabase
      .from("orders")
      .update({ email_sent: true, updated_at: new Date().toISOString() })
      .eq("id", typedOrder.id)

    return NextResponse.json({
      success: true,
      email: { sent: true, attachedInvoice: true },
      invoice: { path: invoice.path },
    })
  } catch (err: unknown) {
    console.error("[orders/confirm] error:", err)
    return NextResponse.json({ error: getErrorMessage(err, "Server error") }, { status: 500 })
  }
}
