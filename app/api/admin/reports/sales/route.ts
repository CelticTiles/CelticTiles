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

    // Fetch orders, leads, and quotations for comprehensive reporting
    const [ordersRes, leadsRes, quotationsRes] = await Promise.all([
      supabase
        .from("orders")
        .select("id, order_number, total, status, created_at, source, items")
        .order("created_at", { ascending: false }),
      supabase
        .from("leads")
        .select("id, status, created_at"),
      supabase
        .from("quotations")
        .select("id, status, total, created_at"),
    ])

    if (ordersRes.error) throw ordersRes.error
    if (leadsRes.error) throw leadsRes.error
    if (quotationsRes.error) throw quotationsRes.error

    const orders = ordersRes.data || []
    const leads = leadsRes.data || []
    const quotations = quotationsRes.data || []

    return NextResponse.json({
      orders,
      leads,
      quotations,
      summary: {
        totalOrders: orders.length,
        totalLeads: leads.length,
        totalQuotations: quotations.length,
        convertedLeads: leads.filter(l => l.status === 'Converted').length,
        acceptedQuotes: quotations.filter(q => q.status === 'accepted').length,
      }
    })
  } catch (err: any) {
    console.error("[reports/sales] error:", err)
    return NextResponse.json({ error: err.message || "Failed to fetch report data" }, { status: 500 })
  }
}
