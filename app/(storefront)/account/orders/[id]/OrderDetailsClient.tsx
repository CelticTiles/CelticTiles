"use client"

import { SiteHeader } from "@/components/layout/site-header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Package, Calendar, Clock, MapPin, Download } from "lucide-react"
import Link from "next/link"
import { formatPrice } from "@/lib/utils"
import { formatOrderDate } from "@/lib/order-utils"
import { StatusBadge } from "@/components/admin/StatusBadge"
import type { Order } from "@/lib/supabase-types"
import type { ServerSession, CategoryWithChildren  } from "@/lib/loaders"
import { toast } from "sonner"

interface OrderDetailsClientProps {
  order: OrderDetails
  session: ServerSession
  categories: CategoryWithChildren[]
}

interface OrderItem {
  product_id: string
  name?: string
  quantity: number
  price: number
}

interface DeliveryAddress {
  address1: string
  address2?: string
  city: string
  county: string
  postcode: string
}
interface OrderDetails {
  id: string
  order_number: string
  invoice_file_id: string | null
  status: string
  created_at: string
  updated_at: string

  subtotal: number
  shipping_fee: number
  discount: number
  total: number

  customer_name: string
  customer_email: string
  customer_phone?: string | null

  items: OrderItem[]
  delivery_address?: DeliveryAddress | null
}


export default function OrderDetailsClient({ order, session, categories }: OrderDetailsClientProps) {
  const handleDownloadInvoice = async () => {
    try {
      const res = await fetch(`/api/orders/${order.id}/invoice`, { method: "GET" })
      const payload = await res.json().catch(() => ({}))

      if (!res.ok || !payload.url) {
        throw new Error(payload.error || "Invoice is not available yet")
      }

      window.open(payload.url, "_blank", "noopener,noreferrer")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to download invoice"
      toast.error(message)
    }
  }

  return (
    <>
      <SiteHeader session={session} categories={categories} />
      
      <main className="bg-tm-bg-muted min-h-screen py-12">
        <div className="container mx-auto max-w-[1000px] px-4">
          
          {/* Back Navigation */}
          <div className="mb-6">
            <Button variant="ghost" size="sm" asChild className="text-tm-text-muted hover:text-tm-text pl-0">
              <Link href="/account/orders">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to My Orders
              </Link>
            </Button>
          </div>

          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-serif font-bold text-primary">Order #{order.order_number}</h1>
                <StatusBadge status={order.status} />
              </div>
              <div className="flex flex-wrap gap-y-2 gap-x-6 text-sm text-tm-text-muted">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>Placed on {formatOrderDate(order.created_at)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span>Last updated {new Date(order.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            {order.invoice_file_id && (
              <Button onClick={handleDownloadInvoice} className="neu-raised border-transparent text-white hover:text-white">
                <Download className="h-4 w-4 mr-2" />
                Download Invoice
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Order Items */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader className="border-b border-tm-border">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    Order Items
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-tm-border">
                    {order.items.map((item, index) => (
                      <div key={index} className="p-6 flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-semibold text-tm-text mb-1">{item.name || `Product ID: ${item.product_id}`}</p>
                          <p className="text-sm text-tm-text-muted">
                            Quantity: {item.quantity} × {formatPrice(item.price || 0)}
                          </p>
                        </div>
                        <p className="font-bold text-tm-text">
                          {formatPrice((item.price || 0) * (item.quantity || 0))}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Order Summary Summary (Mobile fallback/Logic) */}
              <Card className="lg:hidden">
                <CardHeader className="border-b border-tm-border">
                  <CardTitle className="text-lg">Order Total</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-3">
                  <div className="flex justify-between text-tm-text">
                    <span>Subtotal</span>
                    <span>{formatPrice(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-tm-text">
                    <span>Shipping</span>
                    <span>{formatPrice(order.shipping_fee)}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-tm-red">
                      <span>Discount</span>
                      <span>-{formatPrice(order.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xl font-bold text-primary pt-3 border-t border-tm-border">
                    <span>Total</span>
                    <span>{formatPrice(order.total)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Summary & Shipping */}
            <div className="lg:col-span-1 space-y-6">
              {/* Order Summary */}
              <Card className="hidden lg:block">
                <CardHeader className="border-b border-tm-border">
                  <CardTitle className="text-lg font-bold">Summary</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-3">
                  <div className="flex justify-between text-tm-text">
                    <span>Subtotal</span>
                    <span className="font-medium">{formatPrice(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-tm-text">
                    <span>Shipping</span>
                    <span className="font-medium">{formatPrice(order.shipping_fee)}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-tm-red">
                      <span>Discount</span>
                      <span className="font-medium">-{formatPrice(order.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xl font-bold text-primary pt-3 border-t border-tm-border">
                    <span>Total</span>
                    <span>{formatPrice(order.total)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Shipping Address */}
              <Card>
                <CardHeader className="border-b border-tm-border">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Shipping Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {order.delivery_address ? (
                    <div className="text-tm-text-muted space-y-1 text-sm leading-relaxed">
                      <p className="font-semibold text-tm-text uppercase text-xs mb-2 tracking-wider">Address Details</p>
                      <p>{order.delivery_address.address1}</p>
                      {order.delivery_address.address2 && <p>{order.delivery_address.address2}</p>}
                      <p>{order.delivery_address.city}, {order.delivery_address.county}</p>
                      <p>{order.delivery_address.postcode}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-tm-text-muted italic">No address provided</p>
                  )}
                </CardContent>
              </Card>

              {/* Contact Info */}
              <Card>
                <CardHeader className="border-b border-tm-border">
                  <CardTitle className="text-lg">Contact Info</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-3 text-sm">
                  <div>
                    <p className="text-xs font-semibold text-tm-text-muted uppercase tracking-wider mb-1">Customer</p>
                    <p className="text-tm-text">{order.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-tm-text-muted uppercase tracking-wider mb-1">Email</p>
                    <p className="text-tm-text">{order.customer_email}</p>
                  </div>
                  {order.customer_phone && (
                   <div>
                     <p className="text-xs font-semibold text-tm-text-muted uppercase tracking-wider mb-1">Phone</p>
                     <p className="text-tm-text">{order.customer_phone}</p>
                   </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer categories={categories} />
    </>
  )
}
