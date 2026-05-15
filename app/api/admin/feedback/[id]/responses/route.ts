import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { getServerSession } from "@/lib/loaders"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession()
    if (!session.userId || (session.userRole !== "admin" && session.userRole !== "sales")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { message, respondedBy } = await req.json()
    if (!message || !respondedBy) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await createServerSupabase()
    
    // Add response to feedback_responses table
    const { error: responseError } = await (supabase as any)
      .from("feedback_responses")
      .insert({
        feedback_id: id,
        message,
        responded_by: respondedBy
      })

    if (responseError) throw responseError

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to add response" }, { status: 500 })
  }
}
