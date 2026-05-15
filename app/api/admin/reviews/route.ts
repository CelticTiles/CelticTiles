import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"

export async function PATCH(req: Request) {
  const { id, status, admin_response } = await req.json()

  const supabase = await createServerSupabase()

  const { error } = await supabase
    .from("reviews")
    .update({ status, admin_response })
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}