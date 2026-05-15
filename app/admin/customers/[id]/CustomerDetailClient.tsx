"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatPrice } from "@/lib/utils"
import { formatOrderDate } from "@/lib/order-utils"
import { StatusBadge } from "@/components/admin/StatusBadge"
import { ArrowLeft, Mail, Phone, MapPin, Package } from "lucide-react"
import Link from "next/link"

interface CustomerDetailClientProps {
  customer: any
  orders: any[]
  addresses: any[]
}

export default function CustomerDetailClient({ customer, orders, addresses }: CustomerDetailClientProps) {
  const totalSpent = orders.reduce((sum, order) => sum + order.total, 0)
  const totalOrders = orders.length

  return (
    <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/customers/list">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-serif font-bold text-primary">{customer.full_name || 'Customer'}</h1>
              <p className="text-muted-foreground mt-1">Customer Details</p>
            </div>
          </div>

          {/* Customer Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{customer.email}</span>
                </div>
                {customer.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{customer.phone}</span>
                  </div>
                )}
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">Joined {new Date(customer.created_at).toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Order Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold">{totalOrders}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                  <p className="text-2xl font-bold">{formatPrice(totalSpent)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant={customer.is_active !== false ? "success" : "secondary"}>
                  {customer.is_active !== false ? "Active" : "Inactive"}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Order History ({orders.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No orders yet</p>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div>
                        <Link href={`/admin/orders/${order.id}`} className="font-semibold text-primary hover:underline">
                          {order.order_number}
                        </Link>
                        <p className="text-sm text-muted-foreground">{formatOrderDate(order.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatPrice(order.total)}</p>
                        <StatusBadge status={order.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Addresses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Saved Addresses ({addresses.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {addresses.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No saved addresses</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addresses.map((address) => (
                    <div key={address.id} className="p-4 border border-border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold">{address.label || 'Address'}</p>
                        {address.is_default && <Badge variant="success">Default</Badge>}
                      </div>
                      <p className="text-sm">{address.full_name}</p>
                      <p className="text-sm text-muted-foreground">{address.street}</p>
                      <p className="text-sm text-muted-foreground">{address.city}, {address.state} {address.pincode}</p>
                      <p className="text-sm text-muted-foreground">{address.phone}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
    </div>
  )
}
