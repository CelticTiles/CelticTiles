import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { getServerSession } from "@/lib/loaders"
export async function GET() {
  try {
    const session = await getServerSession()
    if (!session.userId || (session.userRole !== "admin" && session.userRole !== "sales")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createServerSupabase()
    const { data, error } = await supabase
      .from("newsletter_subscriptions")
      .select("id, email, name, status, subscribed_at, unsubscribed_at")
      .order("subscribed_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ subscribers: data ?? [] }, { status: 200 })
  } catch {
    return NextResponse.json({ error: "Failed to fetch subscribers" }, { status: 500 })
  }
}

