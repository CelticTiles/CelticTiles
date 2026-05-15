"use client"

import { useEffect, useState, useRef } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import type { CouponFormData } from '@/components/admin/CouponDialog'

export interface Coupon {
  id: string
  code: string
  description: string | null
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_order_value: number | null
  usage_limit: number | null
  used_count: number
  status: 'active' | 'expired'
  expires_at: string | null
  created_at: string
}

export function useCoupons() {
  const supabase = getSupabaseBrowserClient()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const inFlightRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    fetchCoupons()
    return () => { mountedRef.current = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])



  async function fetchCoupons() {
    if (inFlightRef.current) return

    try {
      inFlightRef.current = true
      setIsLoading(true)
      const result = await (supabase
        .from('coupons') as any)
        .select('*')
        .order('created_at', { ascending: false })
      const { data, error } = result || {}

      if (!mountedRef.current) return
      if (error) throw error

      const now = new Date()
      const processed = (data || []).map((c: Coupon) => {
        let effectiveStatus = c.status

        // Check expiry
        if (c.expires_at) {
          let expiryDate = new Date(c.expires_at)
          if (!c.expires_at.includes('T')) {
            expiryDate = new Date(`${c.expires_at}T23:59:59.999Z`)
          }
          if (expiryDate < now) effectiveStatus = 'expired'
        }

        // Check usage limit
        if (c.usage_limit && c.used_count >= c.usage_limit) {
          effectiveStatus = 'expired'
        }

        return { ...c, status: effectiveStatus } as Coupon
      })

      // Lazily update DB for any coupons that just transitioned to expired
      const newlyExpired = processed.filter(
        (c: Coupon, i: number) => c.status === 'expired' && (data || [])[i]?.status === 'active'
      )
      if (newlyExpired.length > 0) {
        const ids = newlyExpired.map((c: Coupon) => c.id)
        ;(supabase.from('coupons') as any)
          .update({ status: 'expired' })
          .in('id', ids)
          .then(() => {})
          .catch(() => {})
      }

      setCoupons(processed)
    } catch (err: any) {
      if (mountedRef.current) setError(err.message)
    } finally {
      inFlightRef.current = false
      if (mountedRef.current) setIsLoading(false)
    }
  }

  async function addCoupon(coupon: CouponFormData) {
    const { data, error } = await (supabase as any)
      .from('coupons')
      .insert([{ ...coupon, used_count: 0, status: 'active' }])
      .select()
      .single()

    if (error) throw error
    setCoupons(prev => [data, ...prev])
    return data
  }

  async function updateCoupon(id: string, updates: Partial<CouponFormData>) {
    const { data, error } = await (supabase as any)
      .from('coupons')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    setCoupons(prev => prev.map(c => c.id === id ? data : c))
    return data
  }

  async function deleteCoupon(id: string) {
    const result = await (supabase
      .from('coupons') as any)
      .delete()
      .eq('id', id)
    const { error } = result || {}

    if (error) throw error
    setCoupons(prev => prev.filter(c => c.id !== id))
  }

  return {
    coupons,
    isLoading,
    error,
    addCoupon,
    updateCoupon,
    deleteCoupon,
    refetch: fetchCoupons
  }
}
