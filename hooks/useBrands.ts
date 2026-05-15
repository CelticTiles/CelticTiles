"use client"

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase'

export interface Brand {
  id: string
  name: string
  slug: string
  logo: string | null
  description: string | null
  created_at: string
}

export function useBrands() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [brands, setBrands] = useState<Brand[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const inFlightRef = useRef(false)

  const fetchBrands = useCallback(async () => {
    if (inFlightRef.current) return

    try {
      inFlightRef.current = true
      setIsLoading(true)
      setError(null)

      const result = await ((supabase as any)
        .from('brands'))
        .select('*')
        .order('name', { ascending: true })
      const { data, error } = result || {}

      if (!mountedRef.current) return
      if (error) throw error
      setBrands(data || [])
    } catch (err: any) {
      if (mountedRef.current) setError(err.message)
    } finally {
      inFlightRef.current = false
      if (mountedRef.current) setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    mountedRef.current = true
    fetchBrands()
    return () => { mountedRef.current = false }
  }, [fetchBrands])

  // Auto-retry: if loading stays stuck for 5s, retry
  useEffect(() => {
    if (!isLoading) return
    const t = setTimeout(() => { if (mountedRef.current && isLoading) fetchBrands() }, 5000)
    return () => clearTimeout(t)
  }, [fetchBrands, isLoading])

  async function addBrand(brand: Omit<Brand, 'id' | 'created_at'>) {
    const result = await (supabase as any)
      .from('brands')
      .insert([brand])
      .select()
      .single()
    const { data, error } = result || {}

    if (error) throw error
    setBrands(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    return data
  }

  async function updateBrand(id: string, updates: Partial<Brand>) {
    const result = await (supabase as any)
      .from('brands')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    const { data, error } = result || {}

    if (error) throw error
    setBrands(prev => prev.map(b => b.id === id ? data : b))
    return data
  }

  async function deleteBrand(id: string) {
    const result = await (supabase as any)
      .from('brands')
      .delete()
      .eq('id', id)
    const { error } = result || {}

    if (error) throw error
    setBrands(prev => prev.filter(b => b.id !== id))
  }

  return {
    brands,
    isLoading,
    error,
    addBrand,
    updateBrand,
    deleteBrand,
    refetch: fetchBrands
  }
}
