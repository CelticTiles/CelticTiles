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
      .from('quotations')
      .select('id, quote_number, status, total, quote_date')
      .eq('lead_id', id)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    return NextResponse.json({ quotations: data ?? [] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch quotations'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
