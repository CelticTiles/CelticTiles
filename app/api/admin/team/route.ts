import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { getServerSession } from "@/lib/loaders"

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