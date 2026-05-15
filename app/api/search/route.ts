import { NextRequest, NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? ""

  if (q.length < 1) {
    return NextResponse.json({ products: [], categories: [] })
  }

  const supabase = await createServerSupabase()

  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, slug, price, image")
      .ilike("name", `%${q}%`)
      .eq("status", "active")
      .limit(6),
    supabase
      .from("categories")
      .select("id, name, slug")
      .ilike("name", `%${q}%`)
      .limit(4),
  ])

  return NextResponse.json({ products: products ?? [], categories: categories ?? [] })
}
