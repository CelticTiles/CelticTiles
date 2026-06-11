import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { getServerSession } from "@/lib/loaders"
import { sendOrderStatusEmail } from "@/lib/email"
import type { Database } from "@/supabase/database.types"

type UpdateStatusBody = {
  status?: string
  note?: string
  updatedBy?: string
}

type StatusHistoryEntry = {
  status: string
  note: string
  timestamp: string
  updated_by: string
}

type OrderStatusHistoryRow = Pick<Database["public"]["Tables"]["orders"]["Row"], "status_history" | "customer_name" | "customer_email" | "order_number" | "total">
type OrderStatusUpdatePayload = Database["public"]["Tables"]["orders"]["Update"] & {
  status_history: StatusHistoryEntry[]
}

function parseBody(body: unknown): UpdateStatusBody {
  if (!body || typeof body !== "object") return {}
  return body as UpdateStatusBody
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const session = await getServerSession()

    if (!session.userId || (session.userRole !== "admin" && session.userRole !== "sales")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = parseBody(await request.json().catch(() => null))
    const status = String(body?.status || "")
    const note = String(body?.note || "")
    const updatedBy = String(body?.updatedBy || session.userName || "admin")

    if (!status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 })
    }

    const supabase = await createServerSupabase()

    // Fetch current order including customer details for the email
    const { data: currentOrder, error: fetchError } = await supabase
      .from("orders")
      .select("status_history, customer_name, customer_email, order_number, total")
      .eq("id", id)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    const typedOrder = currentOrder as OrderStatusHistoryRow | null

    const existingHistory = (Array.isArray(typedOrder?.status_history)
      ? (typedOrder.status_history as StatusHistoryEntry[])
      : [])

    const updatedHistory = [
      ...existingHistory,
      {
        status,
        note,
        timestamp: new Date().toISOString(),
        updated_by: updatedBy,
      },
    ]

    const updatePayload: OrderStatusUpdatePayload = {
      status,
      status_history: updatedHistory,
      updated_at: new Date().toISOString(),
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update(updatePayload)
      .eq("id", id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // ── Email relay: notify customer of status change ────────────────────
    if (typedOrder?.customer_email && typedOrder?.customer_name && typedOrder?.order_number) {
      // Fire-and-forget — don't block the response on email delivery
      sendOrderStatusEmail({
        customerName: typedOrder.customer_name,
        customerEmail: typedOrder.customer_email,
        orderNumber: typedOrder.order_number,
        status,
        total: typedOrder.total ?? 0,
      }).catch(err => {
        console.error(`[OrderStatus] Email relay failed for order ${id}:`, err)
      })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to update order status" }, { status: 500 })
  }
}
