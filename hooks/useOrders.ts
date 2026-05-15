"use client"

import { useEffect, useState, useCallback, useRef } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface Order {
  id: string
  orderNumber: string
  userId: string | null
  customerId: string
  customerName: string
  customerEmail: string
  customerPhone: string
  subtotal: number
  tax: number
  shippingFee: number
  discount: number
  total: number
  paymentMethod: string | null
  paymentStatus: string
  paidAmount: number
  status: string
  deliveryAddress: any
  invoiceFileId: string | null
  invoiceGeneratedAt: string | null
  source: string | null
  createdAt: string
  updatedAt: string
  items: OrderItem[]
  statusHistory: StatusHistoryEntry[]
}

export interface OrderItem {
  productId: string
  productName: string
  sku: string
  quantity: number
  unitPrice: number
  subtotal: number
  image: string | null
}

export interface StatusHistoryEntry {
  status: string
  note: string
  updatedBy: string
  timestamp: string
}

// ─── Transform ──────────────────────────────────────────────────────────────────

function transformDbOrder(dbOrder: any): Order {
  const items = (dbOrder.items || []).map((item: any) => ({
    productId: item.product_id,
    productName: item.product_name,
    sku: item.sku || '',
    quantity: item.quantity,
    unitPrice: item.unit_price,
    subtotal: item.subtotal,
    image: item.image,
  }))

  const statusHistory = (dbOrder.status_history || []).map((entry: any) => ({
    status: entry.status,
    note: entry.note || entry.notes || '',
    updatedBy: entry.updated_by || entry.updatedBy || 'system',
    timestamp: entry.timestamp || entry.created_at || new Date().toISOString(),
  }))

  return {
    id: dbOrder.id,
    orderNumber: dbOrder.order_number,
    userId: dbOrder.user_id,
    customerId: dbOrder.customer_id,
    customerName: dbOrder.customer_name,
    customerEmail: dbOrder.customer_email,
    customerPhone: dbOrder.customer_phone,
    subtotal: dbOrder.subtotal,
    tax: dbOrder.tax,
    shippingFee: dbOrder.shipping_fee,
    discount: dbOrder.discount,
    total: dbOrder.total,
    paymentMethod: dbOrder.payment_method,
    paymentStatus: dbOrder.payment_status,
    paidAmount: dbOrder.paid_amount,
    status: dbOrder.status,
    deliveryAddress: dbOrder.delivery_address,
    invoiceFileId: dbOrder.invoice_file_id,
    invoiceGeneratedAt: dbOrder.invoice_generated_at,
    source: dbOrder.source,
    createdAt: dbOrder.created_at,
    updatedAt: dbOrder.updated_at,
    items,
    statusHistory,
  }
}

// ─── Hook ───────────────────────────────────────────────────────────────────────

export function useOrders(userId?: string | null | 'ALL') {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const isAdminMode = userId === 'ALL' || userId === undefined

  const fetchOrders = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = getSupabaseBrowserClient()

      let query = (supabase as any)
        .from('orders')
        .select('*')

      if (!isAdminMode && userId) {
        query = query.eq('user_id', userId)
      }

      const { data, error: fetchError } = await query.order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      const transformed = (data || []).map(transformDbOrder)
      if (mountedRef.current) setOrders(transformed)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch orders'
      if (mountedRef.current) setError(message)
    } finally {
      if (mountedRef.current) setIsLoading(false)
    }
  }, [isAdminMode, userId])

  useEffect(() => {
    mountedRef.current = true
    fetchOrders()
    return () => { mountedRef.current = false }
  }, [fetchOrders])

  // Realtime sync
  useRealtimeTable({
    table: 'orders',
    enabled: true,
    onInsert: (row) => {
      if (!isAdminMode && typeof userId === 'string' && row.user_id !== userId) return
      const mapped = transformDbOrder(row)
      setOrders((prev) => [mapped, ...prev.filter((o) => o.id !== mapped.id)])
    },
    onUpdate: (row) => {
      if (!isAdminMode && typeof userId === 'string' && row.user_id !== userId) return
      const mapped = transformDbOrder(row)
      setOrders((prev) => prev.map((o) => (o.id === mapped.id ? mapped : o)))
    },
    onDelete: (row) => {
      setOrders((prev) => prev.filter((o) => o.id !== row.id))
    },
  })

  // ─── Actions ────────────────────────────────────────────────────────────────

  async function getOrderById(id: string): Promise<Order> {
    const supabase = getSupabaseBrowserClient()
    const { data, error } = await (supabase as any)
      .from('orders')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return transformDbOrder(data)
  }

  async function updateOrderStatus(orderId: string, status: string, note: string, updatedBy: string) {
    const supabase = getSupabaseBrowserClient()

    const { data: orderData, error: fetchError } = await (supabase as any)
      .from('orders')
      .select('status_history')
      .eq('id', orderId)
      .single()

    if (fetchError) throw fetchError

    const existingHistory = (orderData?.status_history || []) as any[]
    const updatedHistory = [
      ...existingHistory,
      {
        status,
        note: note || '',
        timestamp: new Date().toISOString(),
        updated_by: updatedBy,
      },
    ]

    const { error: updateError } = await (supabase as any)
      .from('orders')
      .update({
        status,
        status_history: updatedHistory,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    if (updateError) throw updateError
  }

  function getOrdersByStatus(status: string) {
    return orders.filter((o) => o.status === status)
  }

  function getRecentOrders(limit: number) {
    return orders.slice(0, limit)
  }

  return {
    orders,
    isLoading,
    error,
    getOrderById,
    updateOrderStatus,
    updateOrderNotes: () => {},
    getOrdersByStatus,
    getRecentOrders,
    refetch: fetchOrders,
  }
}
