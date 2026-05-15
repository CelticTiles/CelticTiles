"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { OrdersTable } from "@/components/admin/OrdersTable"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Filter, ShoppingBag, Download, Calendar } from "lucide-react"
import { Pagination } from "@/components/admin/Pagination"
import { EmptyState } from "@/components/admin/EmptyState"
import { usePagination } from "@/hooks/usePagination"
import { useRealtimeTable } from "@/hooks/useRealtimeTable"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO } from "date-fns"

export type OrderListItem = {
  id: string
  orderNumber: string
  customerName: string
  customerEmail: string
  customerPhone: string | null
  status: string
  source: string | null
  total: string
  createdAt: string
  deliveryAddress: Record<string, string> | null
  items: Array<{ product_id: string; product_name: string; quantity: number; unit_price: number; subtotal: number }>
}

type DateRangePreset = "all" | "weekly" | "monthly" | "yearly" | "custom"

function getPresetRange(preset: DateRangePreset): { from: Date | null; to: Date | null } {
  const now = new Date()
  if (preset === "weekly")  return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) }
  if (preset === "monthly") return { from: startOfMonth(now), to: endOfMonth(now) }
  if (preset === "yearly")  return { from: startOfYear(now), to: endOfYear(now) }
  return { from: null, to: null }
}

function resolveItemName(item: Record<string, unknown>): string {
  return String(
    item.product_name || item.name || item.description || item.title || "Item"
  )
}

function exportToExcel(orders: OrderListItem[], rangeLabel: string) {
  import("xlsx").then((XLSX) => {
    const rows = orders.map((o) => ({
      "Order #":        o.orderNumber,
      "Customer Name":  o.customerName,
      "Customer Email": o.customerEmail,
      "Customer Phone": o.customerPhone ?? "",
      "Status":         o.status,
      "Source":         o.source ?? "",
      "Total (€)":      Number(o.total).toFixed(2),
      "Items":          o.items
        .map(i => `${resolveItemName(i as unknown as Record<string, unknown>)} x${i.quantity}`)
        .join("; ") || "-",
      "Date":           format(parseISO(o.createdAt), "dd/MM/yyyy HH:mm"),
      "Delivery Address": o.deliveryAddress
        ? [o.deliveryAddress.street, o.deliveryAddress.city, o.deliveryAddress.state, o.deliveryAddress.country]
            .filter(Boolean).join(", ")
        : "",
    }))

    const ws = XLSX.utils.json_to_sheet(rows)

    // Column widths
    ws["!cols"] = [
      { wch: 16 }, { wch: 24 }, { wch: 30 }, { wch: 16 }, { wch: 14 },
      { wch: 12 }, { wch: 12 }, { wch: 50 }, { wch: 18 }, { wch: 40 },
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Orders")

    const filename = `Orders_${rangeLabel}_${format(new Date(), "yyyy-MM-dd")}.xlsx`
    XLSX.writeFile(wb, filename)
  })
}

export default function OrdersListClient({ orders }: { orders: OrderListItem[] }) {
  const [ordersState, setOrdersState] = useState<OrderListItem[]>(orders)
  const [searchTerm, setSearchTerm]     = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [datePreset, setDatePreset]     = useState<DateRangePreset>("all")
  const [customFrom, setCustomFrom]     = useState("")
  const [customTo, setCustomTo]         = useState("")

  useRealtimeTable({
    table: "orders",
    onInsert: (row) => {
      const mapped = mapRow(row)
      setOrdersState((prev) => {
        const filtered = prev.filter((o) => o.id !== mapped.id)
        return [mapped, ...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      })
    },
    onUpdate: (row) => {
      const mapped = mapRow(row)
      setOrdersState((prev) => prev.map((o) => (o.id === mapped.id ? mapped : o)))
    },
    onDelete: (row) => {
      setOrdersState((prev) => prev.filter((o) => o.id !== row.id))
    },
  })

  const filteredOrders = useMemo(() => {
    // Date range
    let from: Date | null = null
    let to: Date | null = null

    if (datePreset === "custom") {
      from = customFrom ? new Date(customFrom + "T00:00:00") : null
      to   = customTo   ? new Date(customTo   + "T23:59:59.999") : null
    } else if (datePreset !== "all") {
      const range = getPresetRange(datePreset)
      from = range.from
      to   = range.to
    }

    return ordersState.filter((order) => {
      const matchesSearch =
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === "all" || order.status === statusFilter

      const orderDate = new Date(order.createdAt)
      const matchesDate =
        (!from || orderDate >= from) &&
        (!to   || orderDate <= to)

      return matchesSearch && matchesStatus && matchesDate
    })
  }, [ordersState, searchTerm, statusFilter, datePreset, customFrom, customTo])

  const {
    currentPage,
    totalPages,
    goToPage,
    startIndex,
    endIndex,
    itemsPerPage,
  } = usePagination({ totalItems: filteredOrders.length, itemsPerPage: 10 })

  const currentOrders = filteredOrders.slice(startIndex, endIndex)

  useEffect(() => { goToPage(1) }, [searchTerm, statusFilter, datePreset, customFrom, customTo, goToPage])

  const rangeLabel = useMemo(() => {
    if (datePreset === "weekly")  return "Weekly"
    if (datePreset === "monthly") return "Monthly"
    if (datePreset === "yearly")  return "Yearly"
    if (datePreset === "custom" && customFrom && customTo) return `${customFrom}_to_${customTo}`
    return "All"
  }, [datePreset, customFrom, customTo])

  const handleExport = useCallback(() => {
    exportToExcel(filteredOrders, rangeLabel)
  }, [filteredOrders, rangeLabel])

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">Orders</h1>
          <p className="text-muted-foreground">Manage and track all customer orders</p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative w-56 flex items-center">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
            <Input
              placeholder="Order # or Customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-38">
              <Filter className="w-4 h-4 mr-2 shrink-0" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="New">New</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Processing">Processing</SelectItem>
              <SelectItem value="Shipped">Shipped</SelectItem>
              <SelectItem value="Delivered">Delivered</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          {/* Date range preset */}
          <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DateRangePreset)}>
            <SelectTrigger className="w-38">
              <Calendar className="w-4 h-4 mr-2 shrink-0" />
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="weekly">This Week</SelectItem>
              <SelectItem value="monthly">This Month</SelectItem>
              <SelectItem value="yearly">This Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {/* Export */}
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={filteredOrders.length === 0}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Custom date range inputs */}
      {datePreset === "custom" && (
        <div className="flex flex-wrap gap-3 items-center p-3 bg-accent/10 rounded-lg border border-border">
          <span className="text-sm font-medium text-muted-foreground">From:</span>
          <Input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="w-40"
          />
          <span className="text-sm font-medium text-muted-foreground">To:</span>
          <Input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="w-40"
          />
          {(customFrom || customTo) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setCustomFrom(""); setCustomTo("") }}
            >
              Clear
            </Button>
          )}
        </div>
      )}

      {/* Results summary */}
      {datePreset !== "all" && (
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{filteredOrders.length}</span> order{filteredOrders.length !== 1 ? "s" : ""} for <span className="font-semibold text-foreground">{rangeLabel}</span>
          {statusFilter !== "all" && <> · Status: <span className="font-semibold text-foreground">{statusFilter}</span></>}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Orders ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 && ordersState.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="No orders yet"
              description="Orders will appear here when customers place them"
            />
          ) : filteredOrders.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="No orders found"
              description="Try adjusting your filters"
            />
          ) : (
            <>
              <OrdersTable orders={currentOrders} />
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={goToPage}
                totalItems={filteredOrders.length}
                itemsPerPage={itemsPerPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function mapRow(row: Record<string, unknown>): OrderListItem {
  return {
    id:              String(row.id),
    orderNumber:     String(row.order_number),
    customerName:    String(row.customer_name),
    customerEmail:   String(row.customer_email),
    customerPhone:   row.customer_phone != null ? String(row.customer_phone) : null,
    status:          String(row.status),
    source:          row.source != null ? String(row.source) : null,
    total:           String(row.total),
    createdAt:       String(row.created_at),
    deliveryAddress: (row.delivery_address as Record<string, string>) ?? null,
    items:           Array.isArray(row.items) ? row.items as OrderListItem["items"] : [],
  }
}
