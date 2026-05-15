"use client"

import { useState } from "react"
import { OrderListItem } from "@/app/admin/orders/list/OrdersListClient"
import { OrderDetailModal } from "./OrderDetailModal"
import { formatPrice } from "@/lib/utils"
import { formatOrderDate } from "@/lib/order-utils"
import { StatusBadge } from "./StatusBadge"
import { Button } from "@/components/ui/button"
import { Eye, Download, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface OrdersTableProps {
  orders: OrderListItem[]
}

export function OrdersTable({ orders }: OrdersTableProps) {
  const [selectedOrder, setSelectedOrder] = useState<OrderListItem | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const handleDownloadInvoice = async (order: OrderListItem) => {
    setDownloadingId(order.id)
    try {
      const res = await fetch(`/api/orders/${order.id}/invoice`, { method: "GET" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to generate invoice")
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${order.orderNumber}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to download invoice")
    } finally {
      setDownloadingId(null)
    }
  }

  const handleViewOrder = (order: OrderListItem) => {
    setSelectedOrder(order)
    setIsModalOpen(true)
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No orders found</p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-border bg-accent/5">
              <th className="text-left py-4 px-4 text-sm font-semibold sticky top-0 bg-card">Order #</th>
              <th className="text-left py-4 px-4 text-sm font-semibold">Customer</th>
              <th className="text-right py-4 px-4 text-sm font-semibold">Total</th>
              <th className="text-left py-4 px-4 text-sm font-semibold">Status</th>
              <th className="text-left py-4 px-4 text-sm font-semibold">Source</th>
              <th className="text-left py-4 px-4 text-sm font-semibold">Date</th>
              <th className="text-center py-4 px-4 text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, index) => (
              <tr
                key={order.id}
                className={`border-b border-border hover:bg-accent/5 transition-colors ${
                  index % 2 === 0 ? 'bg-white/50' : ''
                }`}
              >
                <td className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => handleViewOrder(order)}
                    className="text-primary hover:underline font-semibold cursor-pointer"
                  >
                    {order.orderNumber}
                  </button>
                </td>
                <td className="py-3 px-4">
                  <div>
                    <p className="font-medium">{order.customerName}</p>
                    <p className="text-xs text-muted-foreground">{order.customerEmail}</p>
                  </div>
                </td>
                <td className="py-3 px-4 text-right font-mono font-semibold">
                  {formatPrice(Number(order.total))}
                </td>
                <td className="py-3 px-4">
                  <StatusBadge status={order.status} />
                </td>
                <td className="py-3 px-4">
                  {order.source && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      order.source === 'quotation' ? 'bg-purple-100 text-purple-700' :
                      order.source === 'website' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {order.source}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-sm text-muted-foreground">
                  {formatOrderDate(order.createdAt)}
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadInvoice(order)}
                      title="Download Invoice"
                      disabled={downloadingId === order.id}
                    >
                      {downloadingId === order.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Download className="w-4 h-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewOrder(order)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal for order details */}
      {selectedOrder && (
        <OrderDetailModal
          isOpen={isModalOpen}
          onOpenChange={setIsModalOpen}
          order={selectedOrder}
        />
      )}
    </>
  )
}
