import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/loaders'

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession()
    if (!session.userId || (session.userRole !== 'admin' && session.userRole !== 'sales')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await props.params
    const supabase = await createServerSupabase()
    const { data, error } = await (supabase as any)
      .from('activity_logs')
      .select('*')
      .eq('lead_id', id)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return NextResponse.json({ logs: data ?? [] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch logs'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession()
    if (!session.userId || (session.userRole !== 'admin' && session.userRole !== 'sales')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await props.params
    const { action, note } = await req.json()
    if (!action) return NextResponse.json({ error: 'action is required' }, { status: 400 })
    const supabase = await createServerSupabase()
    const { data, error } = await (supabase as any)
      .from('activity_logs')
      .insert({ lead_id: id, action, note: note || null, performed_by: session.userId })
      .select().single()
    if (error) throw new Error(error.message)
    return NextResponse.json({ log: data }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to add log'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
