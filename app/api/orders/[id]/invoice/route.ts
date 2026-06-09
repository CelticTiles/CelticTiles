import { NextRequest, NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { getServerSession } from "@/lib/loaders"
import { generateOrderInvoicePdfBuffer } from "@/lib/order-invoice-pdf"
import type { Json } from "@/supabase/database.types"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function normalizeItems(raw: Json, skuMap: Record<string, string>) {
  if (!Array.isArray(raw)) return []
  return (raw as any[])
    .filter((i): i is any => !!i && typeof i === "object" && !Array.isArray(i))
    .map((i) => {
      const rawVatRate = i.vat_rate ?? i.vatRate
      const parsedVatRate = rawVatRate !== undefined && rawVatRate !== null ? Number(rawVatRate) : undefined
      return {
        product_id: String(i.product_id ?? i.sku ?? ""),
        product_name: String(i.product_name ?? i.name ?? i.description ?? "Item"),
        quantity: Number(i.quantity ?? 0),
        unit_price: Number(i.unit_price ?? i.price ?? 0),
        subtotal: Number(i.subtotal ?? i.amount ?? Number(i.unit_price ?? 0) * Number(i.quantity ?? 0)),
        // Use undefined (not 0) when vat_rate is absent — lets the PDF generator apply its 23% fallback
        vat_rate: (parsedVatRate !== undefined && parsedVatRate > 0) ? parsedVatRate : undefined,
        // Resolve SKU: prefer stored sku field, then look up from products table via UUID
        sku: i.sku || i.assigned_code || skuMap[String(i.product_id ?? "")] || undefined,
      }
    })
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
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const isAdminOrSales = session.userRole === "admin" || session.userRole === "sales"
    const { id } = await props.params
    const supabase = await createServerSupabase()

    // Support both UUID (admin dashboard) and order_number (customer checkout auto-download)
    const isUUID = UUID_PATTERN.test(id)
    const orderQuery = (supabase as any)
      .from("orders")
      .select("id, order_number, customer_name, customer_email, payment_method, created_at, subtotal, tax, discount, shipping_fee, total, items, delivery_address, paid_amount, source, user_id")

    const { data: order, error } = await (isUUID
      ? orderQuery.eq("id", id)
      : orderQuery.eq("order_number", id)
    ).maybeSingle()

    if (error || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // A customer can only download their own invoice; admin/sales can download any
    if (!isAdminOrSales && order.user_id !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Build a map of product_id -> assigned_code for all UUID product IDs in this order
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
          for (const p of products) {
            if (p.assigned_code) {
              skuMap[p.id] = p.assigned_code
            }
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
      items: normalizeItems(order.items as Json, skuMap),
      delivery_address: normalizeAddress(order.delivery_address as Json),
      acc_ref: "",
      sales_rep: "WEB",
      paid_amount: Number(order.paid_amount ?? 0),
      source: order.source || "cart",
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
