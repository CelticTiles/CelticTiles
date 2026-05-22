import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { getServerSession } from "@/lib/loaders"

export const dynamic = "force-dynamic"

async function getAccessToken() {
  const supabase = await createServerSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

async function callEdgeFunction(accessToken: string, body: object) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (!supabaseUrl || !anonKey) {
    throw new Error("Supabase configuration missing")
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/bright-handler`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      "x-client-info": "celtic-tiles-admin-server",
    },
    body: JSON.stringify(body),
  })

  const result = await response.json().catch(() => ({}))
  return { response, result }
}

// POST — create or update team member
export async function POST(request: Request) {
  try {
    const session = await getServerSession()
    if (!session.userId || session.userRole !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const accessToken = await getAccessToken()
    if (!accessToken) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const payload = await request.json()
    const { response, result } = await callEdgeFunction(accessToken, payload)

    if (!response.ok) {
      return NextResponse.json(
        { error: result?.error || result?.message || `Operation failed (${response.status})` },
        { status: response.status }
      )
    }

    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to save team member" }, { status: 500 })
  }
}

// DELETE — remove team member (profile + auth user via edge function)
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession()
    if (!session.userId || session.userRole !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const accessToken = await getAccessToken()
    if (!accessToken) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { id } = await request.json()
    if (!id) {
      return NextResponse.json({ error: "Member id is required" }, { status: 400 })
    }

    // Fetch the member's full profile so the edge function has all required fields
    const supabase = await createServerSupabase()
    const { data: profile, error: profileError } = await (supabase as any)
      .from("profiles")
      .select("id, email, full_name, role:roles(name)")
      .eq("id", id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: "Team member not found" }, { status: 404 })
    }

    // Send full member context + delete signal to edge function
    const { response, result } = await callEdgeFunction(accessToken, {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      role: profile.role?.name ?? "sales",
      _delete: true,
    })

    if (!response.ok) {
      // If edge function doesn't support delete, fall back to deleting just the profile
      // (auth user cleanup can be done via Supabase dashboard or a separate job)
      if (response.status === 400 || response.status === 422) {
        const { error: deleteError } = await (supabase as any)
          .from("profiles")
          .delete()
          .eq("id", id)

        if (deleteError) {
          return NextResponse.json({ error: deleteError.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
      }

      return NextResponse.json(
        { error: result?.error || result?.message || `Delete failed (${response.status})` },
        { status: response.status }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to delete team member" }, { status: 500 })
  }
}
