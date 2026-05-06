import { getServerSession } from "@/lib/loaders"
import { redirect } from "next/navigation"
import OrdersListClient, { OrderListItem } from "./OrdersListClient"
import { createServerSupabase } from "@/lib/supabase/server"

type OrderItemRow = {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number | string
  subtotal: number | string
}

type OrderRow = {
  id: string
  order_number: string
  customer_name: string
  customer_email: string
  customer_phone: string | null
  status: string
  total: string | number | null
  created_at: string
  delivery_address: Record<string, string> | null
  items: OrderItemRow[] | null
}

export const dynamic = "force-dynamic"
export const revalidate = 0

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

export default async function OrdersListPage() {
  const session = await getServerSession()

  if (!session || (session.userRole !== "admin" && session.userRole !== "sales")) {
    redirect("/")
  }

  const supabase = await createServerSupabase()

  const { data: orders, error } = await supabase
    .from("orders")
    .select(`
      id,
      order_number,
      customer_name,
      customer_email,
      customer_phone,
      status,
      total,
      created_at,
      source,
      delivery_address,
      items
    `)
    .order("created_at", { ascending: false })
    .returns<OrderRow[]>()

  if (error) {
    console.error("[Admin Orders] Database error:", error)
    throw new Error(`Failed to load orders: ${error.message}`)
  }

  const productNameMap = await getProductNameMap(supabase, orders ?? [])

  const mappedOrders: OrderListItem[] = (orders ?? []).map((order) => ({
    id: order.id,
    orderNumber: order.order_number,
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    customerPhone: order.customer_phone ?? null,
    status: order.status,
    total: order.total ?? 0,
    createdAt: order.created_at,
    deliveryAddress: order.delivery_address ?? null,
    items: (order.items ?? []).map((item) => ({
      ...item,
      product_name: item.product_name || productNameMap.get(item.product_id) || "",
    })),
  }))

  return <OrdersListClient orders={mappedOrders} />
}
