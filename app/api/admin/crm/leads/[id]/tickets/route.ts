import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { getServerSession } from "@/lib/loaders"

export const dynamic = 'force-dynamic';
export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()
    if (!session.userId || (session.userRole !== 'admin' && session.userRole !== 'sales')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: leadId } = await props.params
    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 })
    }

    const supabase = await createServerSupabase()
    
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select(`
        *,
        assignee:profiles!tickets_assigned_to_fkey(full_name, email),
        creator:profiles!tickets_created_by_fkey(full_name, email)
      `)
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error("Fetch lead tickets error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ tickets: tickets ?? [] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch tickets for lead'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
