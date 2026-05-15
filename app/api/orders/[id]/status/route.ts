import { NextRequest, NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { getServerSession } from "@/lib/loaders"
import { sendOrderStatusEmail } from "@/lib/email"
import { getValidNextStatuses } from "@/lib/order-utils"
import type { Database } from "@/supabase/database.types"

type StatusHistoryRow = {
  status: string
  note: string
  timestamp: string
  updated_by: string
}

type OrderStatusUpdatePayload = Database["public"]["Tables"]["orders"]["Update"] & {
  status_history: Database["public"]["Tables"]["orders"]["Update"]["status_history"]
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const status = typeof body?.status === "string" ? body.status.trim() : ""
    const note = typeof body?.note === "string" ? body.note.trim() : ""

    if (!status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 })
    }

    const session = await getServerSession()
    if (!session.userId || session.userRole !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const supabase = await createServerSupabase()
    const { data: currentOrder, error: currentOrderError } = await supabase
      .from("orders")
      .select("status, status_history, customer_name, customer_email, order_number, total")
      .eq("id", id)
      .maybeSingle()

    if (currentOrderError || !currentOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const currentStatus = currentOrder.status ?? "Pending"
    const allowedStatuses = getValidNextStatuses(currentStatus)
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status transition from ${currentStatus} to ${status}` },
        { status: 400 }
      )
    }

    const existingHistory = Array.isArray(currentOrder.status_history)
      ? (currentOrder.status_history as StatusHistoryRow[])
      : []

    const updatedHistory = [
      ...existingHistory,
      {
        status,
        note,
        timestamp: new Date().toISOString(),
        updated_by: session.userName || "admin",
      },
    ]

    const updatePayload: OrderStatusUpdatePayload = {
      status,
      status_history: JSON.parse(
        JSON.stringify(updatedHistory)
      ) as Database["public"]["Tables"]["orders"]["Update"]["status_history"],
      updated_at: new Date().toISOString(),
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update(updatePayload)
      .eq("id", id)

    if (updateError) {
      return NextResponse.json({ error: "Failed to update status" }, { status: 500 })
    }

    if (currentOrder.customer_email) {
      sendOrderStatusEmail({
        customerName: currentOrder.customer_name,
        customerEmail: currentOrder.customer_email,
        orderNumber: currentOrder.order_number,
        status,
        total: currentOrder.total,
      }).catch((emailError) => {
        console.error("[orders/:id/status] failed to send status email", emailError)
      })
    }

    return NextResponse.json({ success: true, status })
  } catch (error) {
    console.error("[orders/:id/status] error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
