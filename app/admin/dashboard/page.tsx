"use client"

import { useStore } from "@/hooks/useStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import Link from "next/link"
import { formatPrice } from "@/lib/utils"
import { StatusBadge } from "@/components/admin/StatusBadge"
import { formatOrderDate } from "@/lib/order-utils"
import {
  ShoppingBag, Clock, DollarSign, PackageX, Plus,
  Users2, TrendingUp, Warehouse, ClipboardList,
  Package, CheckCircle2, AlertTriangle, Calendar, Phone
} from "lucide-react"
import { useState, useEffect } from "react"
import { IconSpinner } from "@/components/ui/icon-spinner"
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts"

type DateRange = "today" | "7d" | "30d" | "all"

interface RecentOrder {
  id: string
  orderNumber: string
  customerName: string
  total: number
  status: string
  createdAt: string
}

interface ChartPoint { date: string; revenue: number; count: number }

interface DashboardMetrics {
  ranges: Record<DateRange, { total: number; pending: number; revenue: number }>
  charts: Record<DateRange, ChartPoint[]>
  recentOrders: RecentOrder[]
  lowStockCount: number
  crm: { total: number; quoted: number; converted: number; conversionRate: number }
  upcomingFollowUps: { id: string; name: string; email: string; phone: string | null; next_follow_up_date: string; status: string }[]
}

interface InventoryMetrics {
  totalProducts: number
  outOfStock: number
  lowStock: number
  healthyStock: number
  totalAliases: number
  recentAudits: { id: string; created_at: string; status: string; notes: string | null }[]
  stockChartData: { name: string; stock: number; threshold: number }[]
  categoryChartData: { category: string; totalStock: number }[]
}

export default function AdminDashboardPage() {
  const { user, _hasHydrated } = useStore()
  const [dateRange, setDateRange] = useState<DateRange>("30d")
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [inventoryMetrics, setInventoryMetrics] = useState<InventoryMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!_hasHydrated) return

    if (user?.role === "inventory") {
      fetch("/api/admin/inventory/metrics", { credentials: "include" })
        .then((r) => r.json())
        .then((d) => setInventoryMetrics(d))
        .catch(() => {})
        .finally(() => setLoading(false))
    } else {
      fetch("/api/admin/dashboard/metrics", { credentials: "include" })
        .then((r) => r.json())
        .then((d) => setMetrics(d))
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [_hasHydrated, user?.role])

  useEffect(() => {
    if (metrics?.upcomingFollowUps?.length) {
      toast.info(`You have ${metrics.upcomingFollowUps.length} follow-up${metrics.upcomingFollowUps.length === 1 ? "" : "s"} due today.`, {
        description: "Check the 'Follow-ups Due Today' section for details.",
        duration: 8000,
      })
    }
  }, [metrics?.upcomingFollowUps])

  if (!_hasHydrated || loading) {
    return (
      <div className="flex min-h-[60vh] w-full items-center justify-center">
        <IconSpinner label="Loading dashboard..." />
      </div>
    )
  }

  // ── Inventory Dashboard ────────────────────────────────────────────────────
  if (user?.role === "inventory") {
    const invStats = [
      { title: "Total Products", value: inventoryMetrics?.totalProducts ?? "—", icon: Package,      color: "text-blue-600" },
      { title: "Healthy Stock",  value: inventoryMetrics?.healthyStock  ?? "—", icon: CheckCircle2, color: "text-green-600" },
      { title: "Low Stock",      value: inventoryMetrics?.lowStock      ?? "—", icon: AlertTriangle, color: "text-orange-600" },
      { title: "Out of Stock",   value: inventoryMetrics?.outOfStock    ?? "—", icon: PackageX,     color: "text-red-600" },
    ]

    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-serif font-bold text-primary">Warehouse Dashboard</h1>
            <p className="text-muted-foreground mt-1">Welcome back! Here&apos;s your inventory overview.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm">
              <Link href="/admin/inventory/grn"><Warehouse className="w-4 h-4 mr-2" />New GRN</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/inventory/audit"><ClipboardList className="w-4 h-4 mr-2" />New Audit</Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {invStats.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold mt-2">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg bg-accent/10 ${stat.color}`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Lowest Stock Products</CardTitle></CardHeader>
            <CardContent>
              {inventoryMetrics?.stockChartData?.length ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={inventoryMetrics.stockChartData.slice(0, 6)} layout="vertical" margin={{ left: 12, right: 24, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} interval={0} />
                    <Tooltip />
                    <Bar dataKey="stock" name="Current Stock" isAnimationActive={false} radius={[0, 4, 4, 0]} barSize={28}>
                      {inventoryMetrics.stockChartData.slice(0, 6).map((entry, i) => (
                        <Cell key={i} fill={entry.stock === 0 ? "#ef4444" : entry.stock <= entry.threshold ? "#f97316" : "#8b5cf6"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-8">No product data</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Stock by Category</CardTitle></CardHeader>
            <CardContent>
              {inventoryMetrics?.categoryChartData?.length ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={inventoryMetrics.categoryChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="totalStock" name="Total Units" fill="#8b5cf6" isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-8">No category data</p>}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Stock Audits</CardTitle>
            <Button asChild size="sm"><Link href="/admin/inventory/audit">View All</Link></Button>
          </CardHeader>
          <CardContent>
            {!inventoryMetrics?.recentAudits?.length ? (
              <p className="text-center text-muted-foreground py-8">No audits yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryMetrics.recentAudits.map((audit) => (
                      <tr key={audit.id} className="border-b border-border hover:bg-accent/5 transition-colors">
                        <td className="py-3 px-4 text-sm">
                          {new Date(audit.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${audit.status === "completed" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                            {audit.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground truncate max-w-[400px]">{audit.notes ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Admin / Sales Dashboard ────────────────────────────────────────────────
  const r = metrics?.ranges[dateRange] ?? { total: 0, pending: 0, revenue: 0 }
  const chartData = metrics?.charts[dateRange] ?? []

  const stats = [
    { title: "Total Orders",    value: r.total,             icon: ShoppingBag, color: "text-blue-600" },
    { title: "Pending Orders",  value: r.pending,            icon: Clock,       color: "text-orange-600" },
    { title: "Total Revenue",   value: formatPrice(r.revenue), icon: DollarSign,  color: "text-green-600" },
    { title: "Low Stock Items", value: metrics?.lowStockCount ?? "—", icon: PackageX, color: "text-red-600" },
  ]

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back! Here&apos;s your business overview.</p>
        </div>
        <div className="flex gap-2">
          {(["today", "7d", "30d", "all"] as DateRange[]).map((r) => (
            <Button key={r} size="sm" variant={dateRange === r ? "default" : "outline"} onClick={() => setDateRange(r)}>
              {r === "today" ? "Today" : r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : "All Time"}
            </Button>
          ))}
        </div>
      </div>

      {/* CRM Metrics */}
      {metrics?.crm && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Leads</p>
                  <p className="text-3xl font-bold mt-2">{metrics.crm.total}</p>
                </div>
                <div className="p-3 rounded-lg bg-accent/10 text-blue-600"><Users2 className="w-6 h-6" /></div>
              </div>
              <Link href="/admin/crm/leads" className="text-xs text-primary mt-2 block hover:underline">View all leads →</Link>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Quotes Created</p>
                  <p className="text-3xl font-bold mt-2">{metrics.crm.quoted}</p>
                </div>
                <div className="p-3 rounded-lg bg-accent/10 text-purple-600"><ShoppingBag className="w-6 h-6" /></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
                  <p className="text-3xl font-bold mt-2">{metrics.crm.conversionRate}%</p>
                  <p className="text-xs text-muted-foreground mt-1">{metrics.crm.converted} converted</p>
                </div>
                <div className="p-3 rounded-lg bg-accent/10 text-green-600"><TrendingUp className="w-6 h-6" /></div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold mt-2">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg bg-accent/10 ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Revenue Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip formatter={(v) => formatPrice(v as number)} />
                <Line type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Orders Over Time</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders & Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Orders</CardTitle>
            <Button asChild size="sm"><Link href="/admin/orders/list">View All</Link></Button>
          </CardHeader>
          <CardContent>
            {!metrics?.recentOrders?.length ? (
              <p className="text-center text-muted-foreground py-8">No orders yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Order #</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Customer</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.recentOrders.slice(0, 5).map((order) => (
                      <tr key={order.id} className="border-b border-border hover:bg-accent/5 cursor-pointer transition-colors">
                        <td className="py-3 px-4">
                          <Link href={`/admin/orders/${order.id}`} className="text-primary hover:underline font-medium">
                            {order.orderNumber}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-sm">{order.customerName}</td>
                        <td className="py-3 px-4"><StatusBadge status={order.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-600" />
              Follow-ups Due Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!metrics?.upcomingFollowUps?.length ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground">All caught up!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {metrics.upcomingFollowUps.map((lead) => (
                  <div key={lead.id} className="p-3 border rounded-lg bg-accent/5">
                    <div className="flex justify-between items-start mb-1">
                      <Link href={`/admin/crm/leads/${lead.id}`} className="font-semibold text-sm hover:underline">
                        {lead.name}
                      </Link>
                      <StatusBadge status={lead.status} />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="w-3 h-3" />
                      {lead.phone || lead.email}
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href="/admin/crm/leads">View All Leads</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <Button asChild>
          <Link href="/admin/orders/list"><ShoppingBag className="w-4 h-4 mr-2" />View All Orders</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/products/list"><Plus className="w-4 h-4 mr-2" />Manage Products</Link>
        </Button>
      </div>
    </div>
  )
}
