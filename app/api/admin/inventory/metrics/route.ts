import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { getServerSession } from "@/lib/loaders"

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session || (session.userRole !== "admin" && session.userRole !== "sales" && session.userRole !== "inventory")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createServerSupabase()

    const [productsRes, aliasesRes, auditsRes] = await Promise.all([
      supabase
        .from("products")
        .select("id, name, stock, low_stock_threshold, status, categories(name)")
        .in("status", ["active", "inactive"])
        .order("stock", { ascending: true }),
      supabase
        .from("product_aliases")
        .select("id, alias, source, created_at, products(name)", { count: "exact" }),
      supabase
        .from("stock_audits")
        .select("id, created_at, status, notes")
        .order("created_at", { ascending: false })
        .limit(5),
    ])

    const products = productsRes.data ?? []
    const aliases = aliasesRes.data ?? []
    const audits = auditsRes.data ?? []

    const totalProducts = products.length
    const outOfStock = products.filter(p => (p.stock ?? 0) === 0).length
    const lowStock = products.filter(p => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= (p.low_stock_threshold ?? 0)).length
    const healthyStock = totalProducts - outOfStock - lowStock

    // Top 10 lowest stock products for chart
    const stockChartData = products
      .slice(0, 10)
      .map(p => ({
        name: p.name.length > 18 ? p.name.slice(0, 18) + "…" : p.name,
        stock: p.stock ?? 0,
        threshold: p.low_stock_threshold ?? 0,
      }))

    // Category stock breakdown
    const categoryMap = new Map<string, number>()
    products.forEach(p => {
      const cat = (p.categories as any)?.name ?? "Uncategorised"
      categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + (p.stock ?? 0))
    })
    const categoryChartData = Array.from(categoryMap.entries())
      .map(([category, totalStock]) => ({ category, totalStock }))
      .sort((a, b) => b.totalStock - a.totalStock)
      .slice(0, 8)

    return NextResponse.json({
      totalProducts,
      outOfStock,
      lowStock,
      healthyStock,
      totalAliases: aliasesRes.count ?? aliases.length,
      recentAudits: audits,
      stockChartData,
      categoryChartData,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load metrics"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
