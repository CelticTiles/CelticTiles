import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { getServerSession } from "@/lib/loaders"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const session = await getServerSession()
    if (!session.userId || session.userRole !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, password } = await request.json()

    if (!id || !password) {
      return NextResponse.json({ error: "Member id and password are required" }, { status: 400 })
    }

    const supabase = await createServerSupabase()
    const { data: { session: authSession } } = await supabase.auth.getSession()
    const accessToken = authSession?.access_token

    if (!accessToken) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: "Supabase configuration missing" }, { status: 500 })
    }

    // Use the reset-password edge function endpoint
    const response = await fetch(`${supabaseUrl}/functions/v1/bright-handler`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
        "x-client-info": "celtic-tiles-admin-server",
      },
      body: JSON.stringify({ id, password, _reset_password: true }),
    })

    const result = await response.json().catch(() => ({}))

    if (!response.ok) {
      return NextResponse.json(
        { error: result?.error || result?.message || `Password reset failed (${response.status})` },
        { status: response.status }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to reset password" }, { status: 500 })
  }
}
