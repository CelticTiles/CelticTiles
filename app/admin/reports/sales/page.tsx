"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import dynamic from "next/dynamic"
import { formatPrice } from "@/lib/utils"
import { TrendingUp, Package, Users, Download, FileText, FileCheck, Target, ArrowRightLeft, MousePointer2 } from "lucide-react"
import { useState, useMemo, useEffect } from "react"
import { toast } from "sonner"
import { IconSpinner } from "@/components/ui/icon-spinner"
import { Progress } from "@/components/ui/progress"

const SalesReportCharts = dynamic(
  () => import("@/components/admin/SalesReportCharts").then((m) => ({ default: m.SalesReportCharts })),
  { ssr: false }
)

type DateRange = 'today' | '7d' | '30d' | 'all'

const STATUS_COLORS = {
  'Pending': '#f97316',
  'Confirmed': '#ef4444',
  'New': '#3b82f6',
  'Processing': '#f59e0b',
  'Ready': '#8b5cf6',
  'Shipped': '#06b6d4',
  'Delivered': '#10b981',
  'Cancelled': '#6b7280'
}

export default function SalesReportPage() {
  const [data, setData] = useState<{
    orders: any[]
    leads: any[]
    quotations: any[]
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [showCharts, setShowCharts] = useState(false)

  useEffect(() => {
    fetch("/api/admin/reports/sales", { credentials: "include" })
      .then((r) => r.json())
      .then((res) => {
        if (res.error) throw new Error(res.error)
        setData(res)
      })
      .catch((e) => setError(String(e)))
      .finally(() => setIsLoading(false))

    // Delayed chart rendering for performance
    const timeout = setTimeout(() => setShowCharts(true), 600)
    return () => clearTimeout(timeout)
  }, [])

  const filteredData = useMemo(() => {
    if (!data) return null
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    const filterByDate = (items: any[]) => {
      return items.filter(item => {
        const itemDate = new Date(item.created_at)
        switch(dateRange) {
          case 'today': return itemDate >= today
          case '7d': return itemDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          case '30d': return itemDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          default: return true
        }
      })
    }

    return {
      orders: filterByDate(data.orders),
      leads: filterByDate(data.leads),
      quotations: filterByDate(data.quotations)
    }
  }, [data, dateRange])

  const metrics = useMemo(() => {
    if (!filteredData) return null

    const totalRevenue = filteredData.orders
      .filter(o => o.status !== "Cancelled")
      .reduce((sum, o) => sum + Number(o.total), 0)
    
    const avgOrderValue = filteredData.orders.length > 0 ? totalRevenue / filteredData.orders.length : 0
    
    const totalLeads = filteredData.leads.length
    const totalQuotes = filteredData.quotations.length
    const totalOrders = filteredData.orders.length
    const convertedLeads = filteredData.leads.filter(l => l.status === 'Converted').length
    
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0
    const quoteToOrderRate = totalQuotes > 0 ? (filteredData.quotations.filter(q => q.status === 'accepted').length / totalQuotes) * 100 : 0

    return {
      totalRevenue,
      avgOrderValue,
      totalLeads,
      totalQuotes,
      totalOrders,
      convertedLeads,
      conversionRate,
      quoteToOrderRate
    }
  }, [filteredData])

  const revenueChartData = useMemo(() => {
    if (!filteredData) return []
    const dataMap = new Map<string, { revenue: number; sortKey: number }>()
    
    filteredData.orders.forEach(order => {
      if (order.status === 'Cancelled') return
      const orderDate = new Date(order.created_at)
      const dateLabel = orderDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
      const existing = dataMap.get(dateLabel)
      dataMap.set(dateLabel, {
        revenue: (existing?.revenue || 0) + Number(order.total),
        sortKey: existing?.sortKey ?? orderDate.getTime()
      })
    })
    
    return Array.from(dataMap.entries())
      .map(([date, { revenue, sortKey }]) => ({ date, revenue, sortKey }))
      .sort((a, b) => a.sortKey - b.sortKey)
      .slice(-15)
  }, [filteredData])

  const statusBreakdown = useMemo(() => {
    if (!filteredData) return []
    return ["Pending", "Confirmed", "New", "Processing", "Ready", "Shipped", "Delivered", "Cancelled"]
      .map((status) => ({
        name: status,
        value: filteredData.orders.filter(o => o.status === status).length
      }))
      .filter(item => item.value > 0)
  }, [filteredData])

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] w-full items-center justify-center">
        <IconSpinner label="Analyzing sales data..." />
      </div>
    )
  }

  if (!filteredData || !metrics) return null

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-serif font-bold text-primary tracking-tight">Sales Intelligence</h1>
          <p className="text-muted-foreground mt-2 text-lg">Comprehensive performance and CRM analytics</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="bg-muted/50 p-1 rounded-xl flex gap-1 border border-border">
            {(['today', '7d', '30d', 'all'] as const).map((range) => (
              <Button 
                key={range}
                size="sm" 
                variant={dateRange === range ? 'default' : 'ghost'} 
                className={`rounded-lg px-4 transition-all ${dateRange === range ? 'neu-raised shadow-sm' : ''}`}
                onClick={() => setDateRange(range)}
              >
                {range === 'all' ? 'All Time' : range.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="overflow-hidden border-none shadow-premium bg-gradient-to-br from-primary to-[#2a2a45] text-white">
          <CardContent className="p-6 relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <TrendingUp className="w-16 h-16" />
            </div>
            <p className="text-primary-foreground/80 font-medium uppercase tracking-wider text-xs">Gross Revenue</p>
            <h3 className="text-3xl font-bold mt-2">{formatPrice(metrics.totalRevenue)}</h3>
            <div className="mt-4 flex items-center text-xs font-medium bg-white/10 w-fit px-2 py-1 rounded-full">
              <TrendingUp className="w-3 h-3 mr-1" />
              {dateRange === 'all' ? 'All time high' : `vs last ${dateRange}`}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-premium border-none">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-muted-foreground font-medium uppercase tracking-wider text-xs">Total Leads</p>
                <h3 className="text-3xl font-bold mt-2 text-slate-900">{metrics.totalLeads}</h3>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                <Users className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Lead Volume</span>
                <span className="font-semibold text-blue-600">Active</span>
              </div>
              <Progress value={75} className="h-1 bg-blue-100" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-premium border-none">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-muted-foreground font-medium uppercase tracking-wider text-xs">Total Quotes</p>
                <h3 className="text-3xl font-bold mt-2 text-slate-900">{metrics.totalQuotes}</h3>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                <FileText className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Quote Acceptance</span>
                <span className="font-semibold text-purple-600">{metrics.quoteToOrderRate.toFixed(1)}%</span>
              </div>
              <Progress value={metrics.quoteToOrderRate} className="h-1 bg-purple-100" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-premium border-none">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-muted-foreground font-medium uppercase tracking-wider text-xs">Conversions</p>
                <h3 className="text-3xl font-bold mt-2 text-slate-900">{metrics.totalOrders}</h3>
              </div>
              <div className="p-2 bg-green-50 rounded-lg text-green-600">
                <Target className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Lead-to-Order</span>
                <span className="font-semibold text-green-600">{metrics.conversionRate.toFixed(1)}%</span>
              </div>
              <Progress value={metrics.conversionRate} className="h-1 bg-green-100" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {showCharts ? (
            <div className="bg-white rounded-2xl p-6 shadow-premium border border-slate-100 h-full">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-slate-900">Revenue Performance</h3>
              </div>
              <SalesReportCharts
                revenueChartData={revenueChartData.map(({ date, revenue }) => ({ date, revenue }))}
                statusBreakdown={statusBreakdown}
                statusColors={STATUS_COLORS}
              />
            </div>
          ) : (
            <div className="h-[400px] bg-slate-50 rounded-2xl animate-pulse" />
          )}
        </div>

        <div className="space-y-6">
          <Card className="shadow-premium border-none bg-slate-900 text-white">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-primary" />
                Funnel Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Total Leads</span>
                  <span className="font-bold">{metrics.totalLeads}</span>
                </div>
                <Progress value={100} className="h-1.5 bg-slate-800" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Converted Leads</span>
                  <span className="font-bold">{metrics.convertedLeads}</span>
                </div>
                <Progress value={metrics.conversionRate} className="h-1.5 bg-slate-800" />
              </div>
              <div className="pt-4 border-t border-slate-800 text-center">
                <p className="text-4xl font-bold text-primary">{metrics.conversionRate.toFixed(1)}%</p>
                <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Efficiency Rating</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-premium border-none">
            <CardHeader>
              <CardTitle className="text-lg">Inventory Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               {/* Top products snippet */}
               {filteredData.orders
                  .filter(o => o.status !== "Cancelled")
                  .flatMap(o => o.items)
                  .reduce((acc: any[], item: any) => {
                    const existing = acc.find(p => p.productId === item.product_id)
                    if (existing) {
                      existing.quantity += item.quantity
                      existing.revenue += Number(item.subtotal)
                    } else {
                      acc.push({
                        productId: item.product_id,
                        productName: item.product_name,
                        quantity: item.quantity,
                        revenue: Number(item.subtotal)
                      })
                    }
                    return acc
                  }, [])
                  .sort((a, b) => b.revenue - a.revenue)
                  .slice(0, 3)
                  .map((p) => (
                    <div key={p.productId} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                      <div className="max-w-[150px]">
                        <p className="font-bold text-xs truncate">{p.productName}</p>
                        <p className="text-[10px] text-muted-foreground">{p.quantity} sold</p>
                      </div>
                      <p className="font-bold text-primary text-sm">{formatPrice(p.revenue)}</p>
                    </div>
                  ))
               }
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
