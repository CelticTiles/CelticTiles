"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { StatusBadge } from "./StatusBadge"
import { StatusUpdateDialog } from "./StatusUpdateDialog"
import { formatPrice } from "@/lib/utils"
import { formatOrderDate, getValidNextStatuses } from "@/lib/order-utils"
import { useOrders } from "@/hooks/useOrders"
import { useStore } from "@/hooks/useStore"
import { toast } from "sonner"
import type { OrderListItem } from "@/app/admin/orders/list/OrdersListClient"

interface OrderDetailModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  order: OrderListItem
}

function getItemName(item: {
  product_name?: string
  name?: string
}) {
  return item.product_name || item.name || "Unknown product"
}

function getItemSubtotal(item: {
  subtotal?: number | string | null
  unit_price?: number | string | null
  quantity?: number | string | null
}) {
  const subtotal = Number(item.subtotal)

  if (Number.isFinite(subtotal) && subtotal > 0) {
    return subtotal
  }

  const unitPrice = Number(item.unit_price)
  const quantity = Number(item.quantity)

  if (Number.isFinite(unitPrice) && Number.isFinite(quantity)) {
    return unitPrice * quantity
  }

  return 0
}

export function OrderDetailModal({
  isOpen,
  onOpenChange,
  order,
}: OrderDetailModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const { updateOrderStatus } = useOrders(null)
  const { user } = useStore()

  const validNextStatuses = getValidNextStatuses(order.status)

  const handleStatusChange = (newStatus: string) => {
    setSelectedStatus(newStatus)
    setShowStatusDialog(true)
  }

  const handleConfirmStatusChange = async () => {
    if (!selectedStatus || !user) return
    
    setIsUpdating(true)
    try {
      // Call actual database update
      await updateOrderStatus(order.id, selectedStatus, `Status updated by ${user.name}`, user.name)
      toast.success(`Order status updated to ${selectedStatus}`)
      setShowStatusDialog(false)
      setSelectedStatus(null)
      onOpenChange(false) // Close the modal after successful update
    } catch (error) {
      console.error('Error updating order status:', error)
      toast.error('Failed to update order status')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogDescription className="sr-only">
            View order details, customer information, items, and update the order status.
          </DialogDescription>
          <div className="flex items-center justify-between w-full pr-4">
            <div>
              <DialogTitle className="text-2xl">
                <div className="flex items-center gap-3">
                  <span>{order.orderNumber}</span>
                  <StatusBadge status={order.status} />
                </div>
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Created {formatOrderDate(order.createdAt)}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 pr-4">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  <p className="text-sm">{order.customerName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-sm">{order.customerEmail}</p>
                </div>
                {order.customerPhone && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Phone</p>
                    <p className="text-sm">{order.customerPhone}</p>
                  </div>
                )}
                {order.deliveryAddress && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Delivery Address</p>
                    <div className="text-sm">
                      {order.deliveryAddress.street && <p>{order.deliveryAddress.street}</p>}
                      <p>
                        {[order.deliveryAddress.city, order.deliveryAddress.state].filter(Boolean).join(', ')}
                      </p>
                      {order.deliveryAddress.pincode && <p>{order.deliveryAddress.pincode}</p>}
                      {order.deliveryAddress.country && <p>{order.deliveryAddress.country}</p>}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          {order.items && order.items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Order Items ({order.items.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-medium text-muted-foreground">Product</th>
                        <th className="text-center py-2 font-medium text-muted-foreground">Qty</th>
                        <th className="text-right py-2 font-medium text-muted-foreground">Price</th>
                        <th className="text-right py-2 font-medium text-muted-foreground">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item, idx) => (
                        <tr key={idx} className="border-b last:border-0">
                          <td className="py-2.5 pr-4">
                            <p className="font-medium">{getItemName(item)}</p>
                          </td>
                          <td className="py-2.5 text-center text-muted-foreground">{item.quantity}</td>
                          <td className="py-2.5 text-right text-muted-foreground">{formatPrice(item.unit_price)}</td>
                          <td className="py-2.5 text-right font-medium">{formatPrice(getItemSubtotal(item))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Order Total</span>
                <span className="font-semibold text-lg text-primary">
                  {formatPrice(order.total)}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Order created on {formatOrderDate(order.createdAt)}
              </div>
            </CardContent>
          </Card>

          {/* Status Update */}
          {validNextStatuses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Update Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select value={selectedStatus || ""} onValueChange={handleStatusChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    {validNextStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Close
            </Button>
          </div>
        </div>

        {/* Status Update Dialog */}
        {selectedStatus && (
          <StatusUpdateDialog
            isOpen={showStatusDialog}
            currentStatus={order.status}
            newStatus={selectedStatus}
            onConfirm={handleConfirmStatusChange}
            onCancel={() => {
              setShowStatusDialog(false)
              setSelectedStatus(null)
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
