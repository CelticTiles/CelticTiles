"use client"

import { useState, useEffect } from "react"
import { use } from "react"
import { notFound } from "next/navigation"
import { useStore } from "@/hooks/useStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/admin/StatusBadge"
import { StatusUpdateDialog } from "@/components/admin/StatusUpdateDialog"
import { formatPrice } from "@/lib/utils"
import { formatOrderDate, getValidNextStatuses } from "@/lib/order-utils"
import { ChevronDown } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

// ─── Types ─────────────────────────────────────────────────────────────────────

interface StatusHistoryEntry {
  status: string
  note: string
  timestamp: string
  updatedBy?: string
  updated_by?: string
}

interface OrderItem {
  productId?: string
  product_id?: string
  productName?: string
  product_name?: string
  sku?: string
  quantity: number
  unitPrice?: number
  unit_price?: number
  subtotal: number
}

interface Order {
  id: string
  orderNumber: string
  order_number?: string
  customerName: string
  customer_name?: string
  customerEmail: string
  customer_email?: string
  customerPhone?: string
  customer_phone?: string
  status: string
  subtotal: number
  tax: number
  shippingFee?: number
  shipping_fee?: number
  discount?: number
  total: number
  paymentMethod?: string
  payment_method?: string
  paymentStatus?: string
  payment_status?: string
  source?: string
  createdAt?: string
  created_at?: string
  deliveryAddress?: { street?: string; city?: string; state?: string; pincode?: string }
  delivery_address?: { street?: string; city?: string; state?: string; pincode?: string }
  items: OrderItem[]
  statusHistory?: StatusHistoryEntry[]
  status_history?: StatusHistoryEntry[]
}

// Normalise snake_case DB fields to camelCase for the UI
function normaliseOrder(raw: Record<string, unknown>): Order {
  return {
    id: raw.id as string,
    orderNumber: (raw.order_number ?? raw.orderNumber ?? "") as string,
    customerName: (raw.customer_name ?? raw.customerName ?? "") as string,
    customerEmail: (raw.customer_email ?? raw.customerEmail ?? "") as string,
    customerPhone: (raw.customer_phone ?? raw.customerPhone ?? null) as string | undefined,
    status: (raw.status ?? "") as string,
    subtotal: Number(raw.subtotal ?? 0),
    tax: Number(raw.tax ?? 0),
    shippingFee: Number(raw.shipping_fee ?? raw.shippingFee ?? 0),
    discount: Number(raw.discount ?? 0),
    total: Number(raw.total ?? 0),
    paymentMethod: (raw.payment_method ?? raw.paymentMethod ?? "") as string,
    paymentStatus: (raw.payment_status ?? raw.paymentStatus ?? "") as string,
    source: (raw.source ?? "") as string,
    createdAt: (raw.created_at ?? raw.createdAt ?? "") as string,
    deliveryAddress: (raw.delivery_address ?? raw.deliveryAddress ?? {}) as Order["deliveryAddress"],
    items: (Array.isArray(raw.items) ? raw.items : []) as OrderItem[],
    statusHistory: (Array.isArray(raw.status_history) ? raw.status_history : []) as StatusHistoryEntry[],
  }
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useStore()
  const [order, setOrder] = useState<Order | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // ── Load order via existing REST API ─────────────────────────────────────
  useEffect(() => {
    let mounted = true

    async function loadOrder() {
      try {
        const res = await fetch(`/api/admin/orders/${id}`, { credentials: "include" })
        if (!res.ok) {
          if (mounted) notFound()
          return
        }
        const data = await res.json()
        if (mounted) {
          if (data.order) {
            setOrder(normaliseOrder(data.order as Record<string, unknown>))
          } else {
            notFound()
          }
        }
      } catch {
        if (mounted) notFound()
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    loadOrder()
    return () => { mounted = false }
  }, [id])

  // ── Status update via existing PATCH API ──────────────────────────────────
  const handleStatusChange = (newStatus: string) => {
    setSelectedStatus(newStatus)
    setShowDialog(true)
  }

  const handleConfirmStatusChange = async (note: string) => {
    if (!selectedStatus || !order) return

    setIsUpdating(true)
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: selectedStatus,
          note,
          updatedBy: user?.name || "admin",
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to update status")
      }

      toast.success(`Order status updated to ${selectedStatus}`)
      setShowDialog(false)
      setSelectedStatus(null)

      // Reload order to show updated status
      const reload = await fetch(`/api/admin/orders/${order.id}`, { credentials: "include" })
      if (reload.ok) {
        const data = await reload.json()
        if (data.order) setOrder(normaliseOrder(data.order as Record<string, unknown>))
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update order status")
    } finally {
      setIsUpdating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-muted rounded w-1/3" />
        <div className="h-40 bg-muted rounded" />
        <div className="h-40 bg-muted rounded" />
      </div>
    )
  }

  if (!order) return null

  const validNextStatuses = getValidNextStatuses(order.status)
  const addr = order.deliveryAddress ?? order.delivery_address
  const history = order.statusHistory ?? order.status_history ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-serif font-bold text-primary">{order.orderNumber}</h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-muted-foreground mt-1">
            Created {formatOrderDate(order.createdAt ?? "")} • {order.source}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/orders/list">Back to Orders</Link>
        </Button>
      </div>

      {validNextStatuses.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Update Status</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {validNextStatuses.map((status) => (
                <Button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  variant="outline"
                >
                  Mark as {status}
                  <ChevronDown className="w-4 h-4 ml-2 text-slate-900" />
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Customer Information</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><p className="text-sm text-muted-foreground">Name</p><p className="font-medium">{order.customerName}</p></div>
            <div><p className="text-sm text-muted-foreground">Email</p><p className="font-medium">{order.customerEmail}</p></div>
            <div><p className="text-sm text-muted-foreground">Phone</p><p className="font-medium">{order.customerPhone ?? "—"}</p></div>
            {addr && (
              <div>
                <p className="text-sm text-muted-foreground">Delivery Address</p>
                <p className="font-medium">
                  {addr.street}<br />
                  {addr.city}, {addr.state}<br />
                  {addr.pincode}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Payment Information</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><p className="text-sm text-muted-foreground">Payment Method</p><p className="font-medium">{order.paymentMethod}</p></div>
            <div><p className="text-sm text-muted-foreground">Payment Status</p><p className="font-medium">{order.paymentStatus}</p></div>
            <div className="pt-3 space-y-2">
              <div className="flex justify-between"><span className="text-sm">Subtotal</span><span className="font-mono">{formatPrice(order.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-sm">Tax</span><span className="font-mono">{formatPrice(order.tax)}</span></div>
              <div className="flex justify-between"><span className="text-sm">Shipping</span><span className="font-mono">{formatPrice(order.shippingFee ?? 0)}</span></div>
              {(order.discount ?? 0) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span className="text-sm">Discount</span>
                  <span className="font-mono">-{formatPrice(order.discount ?? 0)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-border">
                <span className="font-semibold">Total</span>
                <span className="font-mono font-bold text-primary">{formatPrice(order.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Order Items</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2">Product</th>
                <th className="text-center py-2">SKU</th>
                <th className="text-center py-2">Qty</th>
                <th className="text-right py-2">Price</th>
                <th className="text-right py-2">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="py-3">{item.productName ?? item.product_name}</td>
                  <td className="py-3 text-center font-mono text-sm">{item.sku ?? "—"}</td>
                  <td className="py-3 text-center">{item.quantity}</td>
                  <td className="py-3 text-right font-mono">{formatPrice(item.unitPrice ?? item.unit_price ?? 0)}</td>
                  <td className="py-3 text-right font-mono font-semibold">{formatPrice(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {history.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Status History</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {history.map((entry, index) => (
                <div key={index} className="flex gap-4">
                  <div className="relative">
                    <div className={`w-3 h-3 rounded-full border-2 ${
                      index === history.length - 1
                        ? "bg-primary/20 border-primary/40"
                        : "bg-gray-100 border-gray-300"
                    }`} />
                    {index < history.length - 1 && (
                      <div className="absolute top-3 left-1/2 w-0.5 h-full bg-gray-200 -translate-x-1/2" />
                    )}
                  </div>
                  <div className="flex-1 pb-6">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={entry.status} />
                      <span className="text-sm text-muted-foreground">
                        {formatOrderDate(entry.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      By: {entry.updatedBy ?? entry.updated_by ?? "—"}
                    </p>
                    {entry.note && <p className="text-sm mt-1">{entry.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <StatusUpdateDialog
        isOpen={showDialog}
        currentStatus={order.status}
        newStatus={selectedStatus || ""}
        onConfirm={handleConfirmStatusChange}
        onCancel={() => { setShowDialog(false); setSelectedStatus(null) }}
        isLoading={isUpdating}
      />
    </div>
  )
}
