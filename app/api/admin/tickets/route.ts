import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { getServerSession } from "@/lib/loaders"
import { sendTicketAssignmentEmail } from "@/lib/email"

export async function GET(request: Request) {
  try {
    const session = await getServerSession()
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const assignedTo = searchParams.get("assigned_to")
    const leadId = searchParams.get("lead_id")

    const supabase = await createServerSupabase()

    let query = supabase
      .from("tickets")
      .select(`
        *,
        assignee:profiles!tickets_assigned_to_fkey(full_name, email),
        creator:profiles!tickets_created_by_fkey(full_name, email),
        lead:leads(id, name, email)
      `)
      .order("created_at", { ascending: false })

    if (status) {
      query = query.eq("status", status)
    }

    if (assignedTo) {
      query = query.eq("assigned_to", assignedTo)
    }

    if (leadId) {
      query = query.eq("lead_id", leadId)
    }

    const { data: tickets, error } = await query

    if (error) throw error

    return NextResponse.json({ tickets })
  } catch (error: any) {
    console.error("Fetch tickets error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch tickets" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession()
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, priority, category, assigned_to, due_date, lead_id } = body

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    const supabase = await createServerSupabase()

    const { data: ticket, error } = await supabase
      .from("tickets")
      .insert([
        {
          title,
          description,
          status: assigned_to ? "assigned" : "open",
          priority: priority || "medium",
          category,
          assigned_to: assigned_to || null,
          lead_id: lead_id || null,
          created_by: session.userId,
          due_date: due_date || null
        }
      ])
      .select(`
        *,
        assignee:profiles!tickets_assigned_to_fkey(full_name, email),
        creator:profiles!tickets_created_by_fkey(full_name, email),
        lead:leads(id, name, email)
      `)
      .single()

    if (error) throw error

    // Log ticket creation in lead's activity log if linked to a crm lead
    if (lead_id) {
      await supabase.from("activity_logs").insert({
        lead_id: lead_id,
        action: "ticket_created",
        note: `Ticket "${title}" created`,
        performed_by: session.userId
      })
    }

    if (ticket.assignee?.email) {
      // Fire-and-forget email dispatch
      await sendTicketAssignmentEmail({
        assigneeEmail: ticket.assignee.email,
        assigneeName: ticket.assignee.full_name || "Team Member",
        ticketTitle: ticket.title,
        ticketPriority: ticket.priority,
        ticketCategory: ticket.category,
        dueDate: ticket.due_date
      }).catch(console.error)
    }

    return NextResponse.json({ ticket }, { status: 201 })
  } catch (error: any) {
    console.error("Create ticket error:", error)
    return NextResponse.json({ error: error.message || "Failed to create ticket" }, { status: 500 })
  }
}
