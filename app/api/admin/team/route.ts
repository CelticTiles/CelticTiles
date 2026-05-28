import { NextResponse } from "next/server"
import { createServerSupabase, createAdminClient } from "@/lib/supabase/server"
import { getServerSession } from "@/lib/loaders"

export async function GET(req: Request) {
  try {
    const session = await getServerSession()

    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createServerSupabase()
    
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        role:roles(name)
      `)
      .not('role_id', 'is', null)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const team = (data || []).map((member: any) => ({
      id: member.id,
      email: member.email,
      full_name: member.full_name,
      role: member.role?.name || 'customer'
    })).filter(m => m.role === 'admin' || m.role === 'sales' || m.role === 'inventory')

    return NextResponse.json({ team })
  } catch {
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession()
    if (!session.userId || session.userRole !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const edgeUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/bright-handler`
    const response = await fetch(edgeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, _delete: true })
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || "Failed to delete team member")
    
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession()
    if (!session.userId || session.userRole !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    
    const { id, password } = await req.json()
    if (!id || !password) return NextResponse.json({ error: "Missing data" }, { status: 400 })

    const edgeUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/bright-handler`
    const response = await fetch(edgeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, password, _reset_password: true })
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || "Failed to reset password")
    
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession()
    if (!session.userId || session.userRole !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    
    const payload = await req.json()

    const edgeUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/bright-handler`
    const response = await fetch(edgeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || "Failed to process request")
    
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}