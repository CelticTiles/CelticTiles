import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/loaders'

export async function GET(req: Request) {
  try {
    const session = await getServerSession()
    if (!session.userId || (session.userRole !== 'admin' && session.userRole !== 'sales')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(req.url)
    const compact = searchParams.get("compact") === "true"

    const supabase = await createServerSupabase()
    
    let query = (supabase as any).from('leads')
    if (compact) {
      query = query.select('id, name, email').neq('status', 'Converted').order('created_at', { ascending: false })
    } else {
      query = query.select('*').order('created_at', { ascending: false })
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return NextResponse.json({ leads: data ?? [] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch leads'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession()
    if (!session.userId || (session.userRole !== 'admin' && session.userRole !== 'sales')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { name, email, phone, message, source, merge } = await req.json()
    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }
    const supabase = await createServerSupabase()
    const orFilter = phone ? `email.eq.${email},phone.eq.${phone}` : `email.eq.${email}`
    const { data: existing } = await (supabase as any)
      .from('leads').select('id, name').or(orFilter).maybeSingle()

    if (existing) {
      if (merge) {
        // Log the new enquiry as an activity instead of creating a duplicate lead
        await (supabase as any).from('activity_logs').insert({
          lead_id: existing.id,
          action: 'enquiry_merged',
          note: `New enquiry from ${source || 'manual'}: ${message || 'No message'}`,
          performed_by: session.userId
        })
        
        // Optionally update the lead status back to 'New' if it was converted or closed
        await (supabase as any).from('leads').update({ 
          status: 'New', 
          updated_at: new Date().toISOString() 
        }).eq('id', existing.id)

        return NextResponse.json({ 
          lead: existing, 
          message: 'Enquiry merged with existing lead' 
        }, { status: 200 })
      }
      return NextResponse.json({ 
        error: 'A lead with this email or phone already exists', 
        duplicate: true,
        existingId: existing.id,
        existingName: existing.name
      }, { status: 409 })
    }

    const { data, error } = await (supabase as any)
      .from('leads')
      .insert({ name, email, phone: phone || null, message: message || null, source: source || 'manual', status: 'New' })
      .select().single()
    if (error) throw new Error(error.message)
    return NextResponse.json({ lead: data }, { status: 201 })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create lead'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession()
    if (!session.userId || (session.userRole !== 'admin' && session.userRole !== 'sales')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id, ...updates } = await req.json()
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
    const supabase = await createServerSupabase()

    const { data: oldLead } = await (supabase as any).from('leads').select('status').eq('id', id).maybeSingle()

    const { error } = await (supabase as any).from('leads').update(updates).eq('id', id)
    if (error) throw new Error(error.message)

    // Log status change
    if (updates.status && oldLead && oldLead.status !== updates.status) {
      await (supabase as any).from('activity_logs').insert({
        lead_id: id,
        action: 'status_changed',
        note: `Status updated from ${oldLead.status} to ${updates.status}`,
        performed_by: session.userId
      })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update lead'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession()
    if (!session.userId || session.userRole !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized — admin only' }, { status: 401 })
    }
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
    const supabase = await createServerSupabase()
    
    // Delete related records first to prevent foreign key constraint violations
    await (supabase as any).from('activity_logs').delete().eq('lead_id', id)
    await (supabase as any).from('quotations').delete().eq('lead_id', id)

    const { error } = await (supabase as any).from('leads').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete lead'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
