import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { getServerSession } from "@/lib/loaders"
import type { Database } from "@/supabase/database.types"

type ProductInsertPayload = Database["public"]["Tables"]["products"]["Insert"]

function parsePayload(body: unknown): ProductInsertPayload | null {
  if (!body || typeof body !== "object") return null
  return body as ProductInsertPayload
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession()
    if (!session.userId || (session.userRole !== "admin" && session.userRole !== "sales" && session.userRole !== "inventory")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = parsePayload(await request.json().catch(() => null))
    if (!payload) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    const supabase = await createServerSupabase()
    const { data, error } = await supabase
      .from("products")
      .insert([payload])
      .select("*")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ product: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
  }
}
