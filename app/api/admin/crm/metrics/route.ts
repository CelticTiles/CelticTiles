import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/loaders'

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session.userId || (session.userRole !== 'admin' && session.userRole !== 'sales')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServerSupabase()
    const { data: leads, error } = await (supabase as any)
      .from('leads')
      .select('status')

    if (error) throw new Error(error.message)

    const total = leads?.length ?? 0
    const byStatus = (leads ?? []).reduce((acc: Record<string, number>, l: { status: string }) => {
      acc[l.status] = (acc[l.status] || 0) + 1
      return acc
    }, {})

    const converted = byStatus['Converted'] || 0
    const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0

    return NextResponse.json({
      total,
      new: byStatus['New'] || 0,
      contacted: byStatus['Contacted'] || 0,
      quoted: byStatus['Quoted'] || 0,
      converted,
      conversionRate,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch metrics'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
