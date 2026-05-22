import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
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

    if (!session.userId || session.userRole !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await req.json()

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 })
    }

    const supabase = await createServerSupabase()

    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession()

    if (!session.userId || session.userRole !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, password } = await req.json()

    if (!id || !password) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 })
    }

    const supabase = await createServerSupabase()

    const { error } = await supabase.auth.admin.updateUserById(id, {
      password,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Reset failed" }, { status: 500 })
  }
}