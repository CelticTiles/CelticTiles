import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getServerSession } from "@/lib/loaders"

export async function GET() {
  try {
    const session = await getServerSession()

    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // This works with the anon key since categories are publicly readable on the server
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )

    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug, description, image, parent_id, created_at")
      .order("name", { ascending: true })

    if (error) {
      console.error("[Admin Categories] DB error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ categories: data || [] })
  } catch (err: any) {
    console.error("[Admin Categories] Unexpected error:", err)
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 })
  }
}
