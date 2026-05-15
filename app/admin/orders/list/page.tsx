import { getServerSession } from "@/lib/loaders"
import { redirect } from "next/navigation"
import OrdersListClient, { OrderListItem } from "./OrdersListClient"
import { createServerSupabase } from "@/lib/supabase/server"

type OrderRow = {
  id: string
  order_number: string
  invoice_file_id: string | null
  customer_name: string
  customer_email: string
  customer_phone: string | null
  status: string
  total: string
  created_at: string
  delivery_address: Record<string, string> | null
  items: Array<{ product_id: string; product_name: string; quantity: number; unit_price: number; subtotal: number }> | null
}
export const revalidate = 0

export default async function OrdersListPage() {
  const session = await getServerSession()

  // Allow both admin and sales roles
  if (!session || (session.userRole !== "admin" && session.userRole !== "sales")) {
    redirect("/")
  }

  // ✅ Use server-side client (properly authenticated)
  const supabase = await createServerSupabase()

  // TODO: Implement sales-specific order filtering
  // Currently, sales users see all orders (same as admin)
  // To filter by sales person, you need to:
  // 1. Add a 'created_by_user_id' field to the orders table
  // 2. Set this field when orders are created by sales/admin users
  // 3. Uncomment the filter below:
  
  let query = supabase
    .from("orders")
    .select(`
      id,
      order_number,
      invoice_file_id,
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

  // FOR FUTURE: Filter orders created by this sales person
  // if (session.userRole === "sales") {
  //   query = query.eq("created_by_user_id", session.userId)
  // }

  const { data: orders, error } = await query
    .order("created_at", { ascending: false })
    .returns<OrderRow[]>()



  if (error) {
    console.error('[Admin Orders] ❌ Database error:', error)
    throw new Error(`Failed to load orders: ${error.message}`)
  }

  if (!orders || orders.length === 0) {
    console.warn('[Admin Orders] ⚠️ No orders found in database')
  }

  const mappedOrders: OrderListItem[] = (orders ?? []).map(o => ({
    id: o.id,
    orderNumber: o.order_number,
    customerName: o.customer_name,
    customerEmail: o.customer_email,
    customerPhone: o.customer_phone ?? null,
    status: o.status,
    source: (o as any).source ?? null,
    total: o.total,
    createdAt: o.created_at,
    deliveryAddress: o.delivery_address ?? null,
    items: o.items ?? [],
  }))

  return <OrdersListClient orders={mappedOrders} />
}

