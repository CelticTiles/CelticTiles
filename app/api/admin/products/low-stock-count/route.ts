import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/loaders"
import { createServerSupabase } from "@/lib/supabase/server"
export async function GET() {
  try {
    const session = await getServerSession()

    if (!session.userId || (session.userRole !== "admin" && session.userRole !== "sales")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createServerSupabase()
    const { data, error } = await supabase
      .from("products")
      .select("id, stock, low_stock_threshold, status")
      .eq("status", "active")

    if (error) {
      console.error("[api/admin/products/low-stock-count] query failed", {
        code: error.code,
        message: error.message,
      })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows = (data ?? []) as Array<{ stock: number | null; low_stock_threshold: number | null }>

    const lowStockCount = rows.filter((p) => {
      const threshold = Number(p.low_stock_threshold ?? 0)
      const stock = Number(p.stock ?? 0)
      return stock <= threshold
    }).length

    return NextResponse.json({ count: lowStockCount }, { status: 200 })
  } catch (err) {
    console.error("[api/admin/products/low-stock-count] unexpected failure", err)
    return NextResponse.json({ error: "Failed to load low stock count" }, { status: 500 })
  }
}

