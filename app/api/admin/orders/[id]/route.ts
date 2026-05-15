import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { getServerSession } from "@/lib/loaders"

const ORDER_SELECT_FIELDS = "id, order_number, user_id, customer_id, customer_name, customer_email, customer_phone, subtotal, tax, shipping_fee, discount, total, payment_method, payment_status, paid_amount, status, delivery_address, invoice_file_id, source, created_at, updated_at, items, status_history"
export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const session = await getServerSession()

    if (!session.userId || (session.userRole !== "admin" && session.userRole !== "sales")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createServerSupabase()
    const { data, error } = await supabase
      .from("orders")
      .select(ORDER_SELECT_FIELDS)
      .eq("id", id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ order: data })
  } catch {
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 })
  }
}

