import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { getServerSession } from "@/lib/loaders"

const ORDER_SELECT_FIELDS = "id, order_number, customer_id, customer_name, customer_email, customer_phone, subtotal, tax, shipping_fee, discount, total, payment_method, payment_status, status, delivery_address, invoice_file_id, source, created_at, updated_at, items, status_history"

// GET /api/admin/orders — list all orders (admin/sales only)
export async function GET(req: Request) {
  try {
    const session = await getServerSession()

    if (!session.userId || (session.userRole !== "admin" && session.userRole !== "sales")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const limit = parseInt(searchParams.get("limit") ?? "500", 10)

    const supabase = await createServerSupabase()
    let query = supabase
      .from("orders")
      .select(ORDER_SELECT_FIELDS)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (status && status !== "all") {
      query = query.eq("status", status)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ orders: data ?? [] })
  } catch {
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 })
  }
}
