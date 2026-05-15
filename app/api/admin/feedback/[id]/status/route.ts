import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { getServerSession } from "@/lib/loaders"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession()
    if (!session.userId || (session.userRole !== "admin" && session.userRole !== "sales")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { status } = await req.json()
    if (!status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 })
    }

    const supabase = await createServerSupabase()
    const { error } = await supabase
      .from("feedbacks")
      .update({ status })
      .eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update status" }, { status: 500 })
  }
}
