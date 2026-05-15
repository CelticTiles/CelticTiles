import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { getServerSession } from "@/lib/loaders"

export async function PATCH(req: Request) {
  const session = await getServerSession()
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id, full_name, phone } = await req.json()

  const supabase = await createServerSupabase()

  const { error } = await supabase
    .from("profiles")
    .update({ full_name, phone })
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function DELETE(req: Request) {
  const session = await getServerSession()
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await req.json()

  const supabase = await createServerSupabase()

  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}