import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/loaders"
import { createServerSupabase } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const ORDER_SELECT_FIELDS = "id, order_number, user_id, customer_id, customer_name, customer_email, customer_phone, subtotal, tax, shipping_fee, discount, total, payment_method, payment_status, paid_amount, status, delivery_address, invoice_file_id, source, created_at, updated_at, items, status_history"

type OrderItemRow = {
  product_id: string
  product_name?: string
}

type OrderRow = {
  items?: OrderItemRow[] | null
}

async function getProductNameMap(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  orders: OrderRow[]
) {
  const productIds = [
    ...new Set(
      orders.flatMap((order) =>
        (order.items ?? []).map((item) => item.product_id).filter(Boolean)
      )
    ),
  ]

  if (productIds.length === 0) {
    return new Map<string, string>()
  }

  const { data } = await supabase
    .from("products")
    .select("id, name")
    .in("id", productIds)

  return new Map((data ?? []).map((product) => [product.id, product.name]))
}

export async function GET() {
  try {
    const session = await getServerSession()

    if (!session.userId || (session.userRole !== "admin" && session.userRole !== "sales")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createServerSupabase()

    const { data, error } = await supabase
      .from("orders")
      .select(ORDER_SELECT_FIELDS)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[api/admin/orders/live] query failed", {
        code: error.code,
        message: error.message,
      })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const orders = data ?? []
    const productNameMap = await getProductNameMap(supabase, orders)
    const enrichedOrders = orders.map((order) => ({
      ...order,
      items: Array.isArray(order.items)
        ? order.items.map((item: Record<string, unknown>) => ({
            ...item,
            product_name:
              typeof item.product_name === "string" && item.product_name.length > 0
                ? item.product_name
                : productNameMap.get(String(item.product_id ?? "")) || "",
          }))
        : [],
    }))

    console.info("[api/admin/orders/live] success", {
      role: session.userRole,
      count: enrichedOrders.length,
    })

    return NextResponse.json({ orders: enrichedOrders }, { status: 200 })
  } catch (err) {
    console.error("[api/admin/orders/live] unexpected failure", err)
    return NextResponse.json({ error: "Failed to load admin orders" }, { status: 500 })
  }
}
