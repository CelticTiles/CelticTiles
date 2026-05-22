import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerSupabase } from "@/lib/supabase/server"
import { getServerSession } from "@/lib/loaders"
import type { Database } from "@/lib/supabase-types"

export const dynamic = "force-dynamic"

type TeamRole = "admin" | "sales"

function getServiceSupabase() {
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE

  if (!serviceRoleKey) {
    throw new Error("Missing Supabase service role key")
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )
}

async function assertAdmin() {
  const session = await getServerSession()
  if (!session.userId || session.userRole !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return null
}

async function getRoleId(role: TeamRole) {
  const supabase = await createServerSupabase()
  const { data, error } = await supabase
    .from("roles")
    .select("id")
    .eq("name", role)
    .single()

  if (error || !data?.id) {
    throw new Error(`Role ${role} not found`)
  }

  return data.id
}

export async function POST(request: Request) {
  try {
    const unauthorized = await assertAdmin()
    if (unauthorized) return unauthorized

    const payload = await request.json()
    const fullName = String(payload?.full_name || "").trim()
    const email = String(payload?.email || "").trim().toLowerCase()
    const password = String(payload?.password || "")
    const role = payload?.role === "admin" ? "admin" : "sales"

    if (!fullName) {
      return NextResponse.json({ error: "Full name is required" }, { status: 400 })
    }

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 })
    }

    const [serviceSupabase, roleId] = await Promise.all([
      Promise.resolve(getServiceSupabase()),
      getRoleId(role),
    ])

    const { data: authData, error: authError } = await serviceSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role,
      },
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || "Failed to create user" },
        { status: 500 }
      )
    }

    const { data, error } = await serviceSupabase
      .from("profiles")
      .upsert(
        {
          id: authData.user.id,
          email,
          full_name: fullName,
          role_id: roleId,
          permissions: Array.isArray(payload?.permissions) ? payload.permissions : [],
          is_active: true,
        },
        { onConflict: "id" }
      )
      .select("id, email, full_name, permissions, created_at, role:roles(name)")
      .single()

    if (error) {
      await serviceSupabase.auth.admin.deleteUser(authData.user.id).catch(() => {})
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ teamMember: data }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create team member"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const unauthorized = await assertAdmin()
    if (unauthorized) return unauthorized

    const payload = await request.json()
    const id = String(payload?.id || "")
    const fullName = String(payload?.full_name || "").trim()
    const role = payload?.role === "admin" ? "admin" : "sales"

    if (!id) {
      return NextResponse.json({ error: "Team member id is required" }, { status: 400 })
    }

    if (!fullName) {
      return NextResponse.json({ error: "Full name is required" }, { status: 400 })
    }

    const [serviceSupabase, roleId] = await Promise.all([
      Promise.resolve(getServiceSupabase()),
      getRoleId(role),
    ])

    const { data, error } = await serviceSupabase
      .from("profiles")
      .update({
        full_name: fullName,
        role_id: roleId,
        permissions: Array.isArray(payload?.permissions) ? payload.permissions : [],
      })
      .eq("id", id)
      .select("id, email, full_name, permissions, created_at, role:roles(name)")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ teamMember: data }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update team member"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
