import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/loaders'

export async function GET(
  _req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()
    if (!session.userId || (session.userRole !== 'admin' && session.userRole !== 'sales')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await props.params
    const supabase = await createServerSupabase()

    const { data, error } = await (supabase as any)
      .from('leads')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    return NextResponse.json({ lead: data })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch lead'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
