import { NextRequest, NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { getServerSession } from "@/lib/loaders"
import { generateOrderInvoicePdfBuffer } from "@/lib/order-invoice-pdf"
import type { Json } from "@/supabase/database.types"

function normalizeItems(raw: Json) {
  if (!Array.isArray(raw)) return []
  return (raw as any[])
    .filter((i): i is any => !!i && typeof i === "object" && !Array.isArray(i))
    .map((i) => ({
      product_id: String(i.product_id ?? i.sku ?? ""),
      product_name: String(i.product_name ?? i.name ?? i.description ?? "Item"),
      quantity: Number(i.quantity ?? 0),
      unit_price: Number(i.unit_price ?? i.price ?? 0),
      subtotal: Number(i.subtotal ?? i.amount ?? Number(i.unit_price ?? 0) * Number(i.quantity ?? 0)),
    }))
    .filter((i) => i.quantity > 0)
}

function normalizeAddress(raw: Json) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
  const s = raw as Record<string, unknown>
  return {
    street: String(s.street ?? ""),
    city: String(s.city ?? ""),
    state: String(s.state ?? ""),
    pincode: String(s.pincode ?? ""),
    country: String(s.country ?? "Ireland"),
  }
}

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()
    if (!session.userId || (session.userRole !== "admin" && session.userRole !== "sales")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await props.params
    const supabase = await createServerSupabase()

    const { data: order, error } = await (supabase as any)
      .from("orders")
      .select("id, order_number, customer_name, customer_email, payment_method, created_at, subtotal, tax, discount, shipping_fee, total, items, delivery_address")
      .eq("id", id)
      .maybeSingle()

    if (error || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
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
      items: normalizeItems(order.items as Json),
      delivery_address: normalizeAddress(order.delivery_address as Json),
    })

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${order.order_number}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
      },
    })
  } catch (err) {
    console.error("[invoice] error:", err)
    return NextResponse.json({ error: "Failed to generate invoice" }, { status: 500 })
  }
}
