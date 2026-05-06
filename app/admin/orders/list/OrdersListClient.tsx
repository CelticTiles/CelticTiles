"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { OrdersTable } from "@/components/admin/OrdersTable"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Filter, ShoppingBag } from "lucide-react"
import { Pagination } from "@/components/admin/Pagination"
import { EmptyState } from "@/components/admin/EmptyState"
import { usePagination } from "@/hooks/usePagination"

export type OrderListItem = {
  id: string
  orderNumber: string
  customerName: string
  customerEmail: string
  customerPhone: string | null
  status: string
  total: number | string
  createdAt: string
  deliveryAddress: Record<string, string> | null
  items: Array<{ product_id: string; product_name: string; quantity: number; unit_price: number | string; subtotal: number | string }>
}

export default function OrdersListClient({
  orders,
}: {
  orders: OrderListItem[]
}) {
  const [ordersState, setOrdersState] = useState<OrderListItem[]>(orders)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    let timer: number | undefined
    let cancelled = false

    const fetchLiveOrders = async () => {
      try {
        const response = await fetch('/api/admin/orders/live', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        })

        if (!response.ok) return

        const payload = await response.json()
        const rows = Array.isArray(payload?.orders) ? payload.orders : []
        const mappedRows: OrderListItem[] = rows.map((row: any) => ({
          id: row.id,
          orderNumber: row.order_number,
          customerName: row.customer_name,
          customerEmail: row.customer_email,
          customerPhone: row.customer_phone ?? null,
          status: row.status,
          total: row.total,
          createdAt: row.created_at,
          deliveryAddress: row.delivery_address ?? null,
          items: Array.isArray(row.items) ? row.items : [],
        }))

        if (!cancelled) {
          setOrdersState(mappedRows)
        }
      } catch {
        // Keep last rendered data when transient network errors occur.
      }
    }

    timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchLiveOrders()
      }
    }, 15000)

    return () => {
      cancelled = true
      if (timer) {
        window.clearInterval(timer)
      }
    }
  }, [])

  const filteredOrders = useMemo(() => {
    return ordersState.filter(order => {
      const matchesSearch =
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus =
        statusFilter === "all" || order.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [ordersState, searchTerm, statusFilter])

  const {
    currentPage,
    totalPages,
    goToPage,
    startIndex,
    endIndex,
    itemsPerPage,
  } = usePagination({
    totalItems: filteredOrders.length,
    itemsPerPage: 10,
  })

  const currentOrders = filteredOrders.slice(startIndex, endIndex)

  useEffect(() => {
    goToPage(1)
  }, [searchTerm, statusFilter, goToPage])

  return (
    <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <h1 className="text-3xl font-serif font-bold text-primary">
                Orders
              </h1>
              <p className="text-muted-foreground">
                Manage and track all customer orders
              </p>
            </div>

            <div className="flex gap-3 items-center">
              <div className="relative w-64 flex items-center">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                <Input
                  placeholder="Order # or Customer..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Processing">Processing</SelectItem>
                  <SelectItem value="Shipped">Shipped</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

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
