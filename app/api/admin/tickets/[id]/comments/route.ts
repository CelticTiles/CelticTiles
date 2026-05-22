import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { getServerSession } from "@/lib/loaders"

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params
    const session = await getServerSession()
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createServerSupabase()

    const { data: comments, error } = await supabase
      .from("ticket_comments")
      .select(`
        *,
        author:profiles!ticket_comments_user_id_fkey(full_name, email)
      `)
      .eq("ticket_id", params.id)
      .order("created_at", { ascending: true })

    if (error) throw error

    return NextResponse.json({ comments })
  } catch (error: any) {
    console.error("Fetch comments error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch comments" }, { status: 500 })
  }
}

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params
    const session = await getServerSession()
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    if (!body.comment) {
      return NextResponse.json({ error: "Comment text is required" }, { status: 400 })
    }

    const supabase = await createServerSupabase()

    const { data: comment, error } = await supabase
      .from("ticket_comments")
      .insert([
        {
          ticket_id: params.id,
          user_id: session.userId,
          comment: body.comment
        }
      ])
      .select(`
        *,
        author:profiles!ticket_comments_user_id_fkey(full_name, email)
      `)
      .single()

    if (error) throw error

    return NextResponse.json({ comment }, { status: 201 })
  } catch (error: any) {
    console.error("Create comment error:", error)
    return NextResponse.json({ error: error.message || "Failed to create comment" }, { status: 500 })
  }
}
