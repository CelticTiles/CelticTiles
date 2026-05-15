import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { getServerSession } from "@/lib/loaders"
import type { Database } from "@/supabase/database.types"

type CouponInsertPayload = Database["public"]["Tables"]["coupons"]["Insert"]

function parsePayload(body: unknown): CouponInsertPayload {
  if (!body || typeof body !== "object") return {} as CouponInsertPayload
  return body as CouponInsertPayload
}

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session.userId || (session.userRole !== "admin" && session.userRole !== "sales")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createServerSupabase()
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ coupons: data ?? [] }, { status: 200 })
  } catch {
    return NextResponse.json({ error: "Failed to fetch coupons" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession()
    if (!session.userId || (session.userRole !== "admin" && session.userRole !== "sales")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = parsePayload(await request.json().catch(() => null))
    const supabase = await createServerSupabase()
    const { data, error } = await supabase
      .from("coupons")
      .insert([payload])
      .select("*")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ coupon: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create coupon" }, { status: 500 })
  }
}


