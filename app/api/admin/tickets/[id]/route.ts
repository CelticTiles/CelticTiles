import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { getServerSession } from "@/lib/loaders"
import { sendTicketAssignmentEmail } from "@/lib/email"

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params
    const session = await getServerSession()
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createServerSupabase()

    const { data: ticket, error } = await supabase
      .from("tickets")
      .select(`
        *,
        assignee:profiles!tickets_assigned_to_fkey(full_name, email),
        creator:profiles!tickets_created_by_fkey(full_name, email)
      `)
      .eq("id", params.id)
      .single()

    if (error) throw error
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 })

    return NextResponse.json({ ticket })
  } catch (error: any) {
    console.error("Fetch ticket error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch ticket" }, { status: 500 })
  }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params
    const session = await getServerSession()
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const supabase = await createServerSupabase()

    // Fetch old ticket to see if assignee changed, and for logging status changes
    const { data: oldTicket } = await supabase.from("tickets").select("assigned_to, status, lead_id").eq("id", params.id).single()

    // Status logic: if assigned_to is newly set, and status is open, set to assigned
    let { status } = body
    if (body.assigned_to && body.status === "open") {
      status = "assigned"
    }

    const updates = {
      ...body,
      status: status || body.status
    }

    const { data: ticket, error } = await supabase
      .from("tickets")
      .update(updates)
      .eq("id", params.id)
      .select(`
        *,
        assignee:profiles!tickets_assigned_to_fkey(full_name, email),
        creator:profiles!tickets_created_by_fkey(full_name, email)
      `)
      .single()

    if (error) throw error

    // Log status change if lead_id exists and status changed
    if (oldTicket && oldTicket.lead_id && updates.status && oldTicket.status !== updates.status) {
      await supabase.from("activity_logs").insert({
        lead_id: oldTicket.lead_id,
        action: "ticket_status_changed",
        note: `Ticket "${ticket.title}" status changed from ${oldTicket.status.replace(/_/g, " ")} to ${updates.status.replace(/_/g, " ")}`,
        performed_by: session.userId
      })
    }

    // Send email if reassigned or newly assigned to someone
    if (body.assigned_to && oldTicket && body.assigned_to !== oldTicket.assigned_to && ticket.assignee?.email) {
      sendTicketAssignmentEmail({
        assigneeEmail: ticket.assignee.email,
        assigneeName: ticket.assignee.full_name || "Team Member",
        ticketTitle: ticket.title,
        ticketPriority: ticket.priority,
        ticketCategory: ticket.category,
        dueDate: ticket.due_date
      }).catch(console.error)
    }

    return NextResponse.json({ ticket })
  } catch (error: any) {
    console.error("Update ticket error:", error)
    return NextResponse.json({ error: error.message || "Failed to update ticket" }, { status: 500 })
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params
    const session = await getServerSession()
    if (!session.userId || session.userRole !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Admin only." }, { status: 401 })
    }

    const supabase = await createServerSupabase()

    const { error } = await supabase
      .from("tickets")
      .delete()
      .eq("id", params.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Delete ticket error:", error)
    return NextResponse.json({ error: error.message || "Failed to delete ticket" }, { status: 500 })
  }
}
