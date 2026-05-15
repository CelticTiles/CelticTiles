import { notFound, redirect } from "next/navigation"
import { createServerSupabase } from "@/lib/supabase/server"
import { getServerSession, getNavData } from "@/lib/loaders"
import OrderDetailsClient from "./OrderDetailsClient"
import type { Order } from "@/lib/supabase-types"
import type { Json } from "@/supabase/database.types"

interface PageProps {
  params: Promise<{
    id: string
  }>
}

interface OrderDetailsShape {
  id: string
  order_number: string
  invoice_file_id: string | null
  status: string
  created_at: string
  updated_at: string
  subtotal: number
  shipping_fee: number
  discount: number
  total: number
  customer_name: string
  customer_email: string
  customer_phone?: string | null
  items: Array<{
    product_id: string
    name?: string
    quantity: number
    price: number
  }>
  delivery_address?: {
    address1: string
    address2?: string
    city: string
    county: string
    postcode: string
  } | null
}

function toOrderItems(raw: Json): OrderDetailsShape["items"] {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => {
    const source =
      item && typeof item === "object" && !Array.isArray(item)
        ? (item as Record<string, unknown>)
        : {}
    return {
      product_id: String(source.product_id ?? ""),
      name: typeof source.product_name === "string" ? source.product_name : undefined,
      quantity: Number(source.quantity ?? 0),
      price: Number(source.unit_price ?? source.price ?? 0),
    }
  })
}

function toDeliveryAddress(raw: Json): OrderDetailsShape["delivery_address"] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
  const source = raw as Record<string, unknown>
  return {
    address1: String(source.street ?? source.address1 ?? ""),
    address2: typeof source.address2 === "string" ? source.address2 : undefined,
    city: String(source.city ?? ""),
    county: String(source.state ?? source.county ?? ""),
    postcode: String(source.pincode ?? source.postcode ?? ""),
  }
}

export default async function OrderDetailsPage({ params }: PageProps) {
  const { id } = await params
  
  // 1. Get Session
  const session = await getServerSession()
  if (!session.userId) {
    redirect("/login")
  }

  // 2. Fetch Data in Parallel
  const [supabase, { categories }] = await Promise.all([
    createServerSupabase(),
    getNavData()
  ])

  // 3. Fetch Order
  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single()

  // 4. Security & Existence Checks
  if (error || !order) {
    notFound()
  }

  const typedOrder = order as Order
  const normalizedOrder: OrderDetailsShape = {
    id: typedOrder.id,
    order_number: typedOrder.order_number,
    invoice_file_id: typedOrder.invoice_file_id,
    status: typedOrder.status ?? "Pending",
    created_at: typedOrder.created_at,
    updated_at: typedOrder.updated_at,
    subtotal: typedOrder.subtotal,
    shipping_fee: typedOrder.shipping_fee ?? 0,
    discount: typedOrder.discount ?? 0,
    total: typedOrder.total,
    customer_name: typedOrder.customer_name,
    customer_email: typedOrder.customer_email,
    customer_phone: typedOrder.customer_phone ?? null,
    items: toOrderItems(typedOrder.items),
    delivery_address: toDeliveryAddress(typedOrder.delivery_address),
  }

  // Verify Ownership: Check user_id first, then fallback to email (as per user instruction)
  const isOwner = typedOrder.user_id === session.userId || typedOrder.customer_email === session.userEmail

  if (!isOwner) {
    // Ownership mismatch: notFound() to prevent leaking order existence (security best practice)
    notFound()
  }

  return (
    <OrderDetailsClient 
      order={normalizedOrder} 
      session={session} 
      categories={categories} 
    />
  )
}
