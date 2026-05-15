"use client"

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import type { Database } from '@/lib/supabase-types'

export interface Customer {
  id: string
  name: string
  email: string
  phone: string | null
  totalOrders: number
  totalSpent: number
  joinedAt: string
  lastOrderDate: string | null
}

type RoleRow = Pick<Database["public"]["Tables"]["roles"]["Row"], "id">
type ProfileRow = Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "email" | "full_name" | "phone" | "created_at">
type OrderSummaryRow = Pick<Database["public"]["Tables"]["orders"]["Row"], "user_id" | "total" | "created_at" | "customer_phone">

export function useCustomers() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const inFlightRef = useRef(false)
  const customerRoleIdRef = useRef<string | null>(null)

  const fetchCustomers = useCallback(async () => {
    if (inFlightRef.current) return

    try {
      inFlightRef.current = true
      setIsLoading(true)
      setError(null)
      
      // 1. Resolve Customer Role ID once and reuse during polling/refetches.
      if (!customerRoleIdRef.current) {
        const roleResult = await supabase
          .from('roles')
          .select('id')
          .eq('name', 'customer')
          .single()

        if (!mountedRef.current) return
        if (!roleResult || roleResult.error) throw roleResult?.error || new Error('Failed to fetch roles')
        customerRoleIdRef.current = (roleResult.data as RoleRow).id
      }
      const customerRoleId = customerRoleIdRef.current
      if (!customerRoleId) {
        throw new Error('Customer role is unavailable')
      }

      // 2. Fetch Profiles and Orders in parallel for better performance
      const [profilesResult, ordersResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, email, full_name, phone, created_at')
          .eq('role_id', customerRoleId)
          .order('created_at', { ascending: false }),
        supabase
          .from('orders')
          .select('user_id, total, created_at, customer_phone')
      ])

      if (!mountedRef.current) return
      if (!profilesResult || profilesResult.error) throw profilesResult?.error || new Error('Failed to fetch profiles')
      
      const profiles = (profilesResult.data || []) as ProfileRow[]
      const orders = (ordersResult?.data || []) as OrderSummaryRow[]

      if (!profiles || profiles.length === 0) {
        if (mountedRef.current) { setCustomers([]); setIsLoading(false) }
        return
      }

      // 3. Aggregate Data (client-side - fast since data is already loaded)
      const customerData = profiles.map((profile) => {
        const userOrders = orders.filter((o) => o.user_id === profile.id)
        
        const totalOrders = userOrders.length
        const totalSpent = userOrders.reduce((sum: number, o) => sum + (o.total || 0), 0)
        
        // Find phone
        let phone = profile.phone || null
        if (!phone && userOrders.length > 0) {
          phone = userOrders[0].customer_phone
        }

        const lastOrder = userOrders.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0]

        return {
          id: profile.id,
          name: profile.full_name || profile.email?.split('@')[0] || 'Unknown',
          email: profile.email,
          phone: phone || 'N/A',
          totalOrders,
          totalSpent,
          joinedAt: profile.created_at,
          lastOrderDate: lastOrder ? lastOrder.created_at : null
        }
      })

      if (mountedRef.current) setCustomers(customerData)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch customers'
      if (mountedRef.current) setError(message)
    } finally {
      inFlightRef.current = false
      if (mountedRef.current) setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    mountedRef.current = true
    fetchCustomers()
    return () => { mountedRef.current = false }
  }, [fetchCustomers])

  // Keep admin customer screens fresh without requiring focus changes.
  useEffect(() => {
    if (typeof window === 'undefined') return

    const isAdminRoute = window.location.pathname.startsWith('/admin')
    if (!isAdminRoute) return

    const POLL_INTERVAL_MS = 15000
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && !inFlightRef.current) {
        fetchCustomers()
      }
    }, POLL_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [fetchCustomers])

  return {
    customers,
    isLoading,
    error,
    refetch: fetchCustomers
  }
}
