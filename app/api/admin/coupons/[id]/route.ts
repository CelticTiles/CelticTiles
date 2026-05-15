import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { getServerSession } from "@/lib/loaders"
import type { Database } from "@/supabase/database.types"

type CouponUpdatePayload = Database["public"]["Tables"]["coupons"]["Update"]

function parsePayload(body: unknown): CouponUpdatePayload {
  if (!body || typeof body !== "object") return {}
  return body as CouponUpdatePayload
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const session = await getServerSession()
    if (!session.userId || (session.userRole !== "admin" && session.userRole !== "sales")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = parsePayload(await request.json().catch(() => null))
    const supabase = await createServerSupabase()
    const { data, error } = await supabase
      .from("coupons")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ coupon: data })
  } catch {
    return NextResponse.json({ error: "Failed to update coupon" }, { status: 500 })
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const session = await getServerSession()
    if (!session.userId || (session.userRole !== "admin" && session.userRole !== "sales")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createServerSupabase()
    const { error } = await supabase
      .from("coupons")
      .delete()
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete coupon" }, { status: 500 })
  }
}


