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

    // All queries run in parallel — no sequential waterfalls
    const [ordersRes, productsRes, leadsRes, followUpsRes] = await Promise.all([
      // Only fetch the fields dashboard needs + last 90 days for chart data
      supabase
        .from("orders")
        .select("id, order_number, customer_name, total, status, created_at")
        .or("payment_method.neq.card,payment_status.neq.Pending")
        .order("created_at", { ascending: false })
        .limit(500),

      // Only stock fields for low-stock count
      supabase
        .from("products")
        .select("id, stock, low_stock_threshold")
        .eq("status", "active"),

      // Only status for conversion metrics
      supabase
        .from("leads")
        .select("status"),

      // Upcoming follow-ups
      supabase
        .from("leads")
        .select("id, name, email, phone, next_follow_up_date, status")
        .neq("status", "Converted")
        .not("next_follow_up_date", "is", null)
        .gte("next_follow_up_date", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
        .lte("next_follow_up_date", new Date(new Date().setHours(23, 59, 59, 999)).toISOString())
        .order("next_follow_up_date", { ascending: true })
        .limit(10),
    ])

    // ── Orders aggregation (all done server-side, nothing heavy sent to client) ──
    const orders = ordersRes.data ?? []
    const recentOrders = orders.slice(0, 5).map((o) => ({
      id: o.id,
      orderNumber: o.order_number,
      customerName: o.customer_name,
      total: Number(o.total),
      status: o.status,
      createdAt: o.created_at,
    }))

    const now = Date.now()
    const MS = { "7d": 7 * 864e5, "30d": 30 * 864e5 }

    function aggregate(cutoff: number | null) {
      const subset = cutoff
        ? orders.filter((o) => new Date(o.created_at).getTime() >= cutoff)
        : orders
      const total = subset.length
      const pending = subset.filter((o) => o.status === "Pending" || o.status === "Confirmed").length
      const revenue = subset
        .filter((o) => o.status !== "Cancelled")
        .reduce((s, o) => s + Number(o.total), 0)
      return { total, pending, revenue }
    }

    const ranges = {
      today: aggregate(new Date(new Date().setHours(0, 0, 0, 0)).getTime()),
      "7d":  aggregate(now - MS["7d"]),
      "30d": aggregate(now - MS["30d"]),
      all:   aggregate(null),
    }

    // Chart data — group by day label
    function buildChart(cutoff: number | null) {
      const subset = cutoff
        ? orders.filter((o) => new Date(o.created_at).getTime() >= cutoff)
        : orders.slice(0, 90)

      const revenueMap = new Map<string, { ts: number; revenue: number; count: number }>()
      for (const o of subset) {
        if (o.status === "Cancelled") continue
        const d = new Date(o.created_at)
        const label = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
        const existing = revenueMap.get(label)
        revenueMap.set(label, {
          ts: existing?.ts ?? d.getTime(),
          revenue: (existing?.revenue ?? 0) + Number(o.total),
          count: (existing?.count ?? 0) + 1,
        })
      }
      return Array.from(revenueMap.entries())
        .map(([date, v]) => ({ date, revenue: Math.round(v.revenue * 100) / 100, count: v.count, ts: v.ts }))
        .sort((a, b) => a.ts - b.ts)
        .slice(-14)
        .map(({ date, revenue, count }) => ({ date, revenue, count }))
    }

    const charts = {
      today: buildChart(new Date(new Date().setHours(0, 0, 0, 0)).getTime()),
      "7d":  buildChart(now - MS["7d"]),
      "30d": buildChart(now - MS["30d"]),
      all:   buildChart(null),
    }

    // ── Products ──
    const products = productsRes.data ?? []
    const lowStockCount = products.filter(
      (p) => (p.stock ?? 0) <= (p.low_stock_threshold ?? 5)
    ).length

    // ── CRM leads ──
    const leads = leadsRes.data ?? []
    const total = leads.length
    const byStatus = leads.reduce((acc: Record<string, number>, l) => {
      acc[l.status] = (acc[l.status] ?? 0) + 1
      return acc
    }, {})
    const converted = byStatus["Converted"] ?? 0
    const crm = {
      total,
      quoted: byStatus["Quoted"] ?? 0,
      converted,
      conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0,
    }

    const upcomingFollowUps = followUpsRes.data ?? []

    return NextResponse.json({ ranges, charts, recentOrders, lowStockCount, crm, upcomingFollowUps })
  } catch (err) {
    console.error("[dashboard/metrics]", err)
    return NextResponse.json({ error: "Failed to load metrics" }, { status: 500 })
  }
}
