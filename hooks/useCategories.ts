"use client"

import { useEffect, useState, useRef, useCallback } from 'react'

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  parent_id: string | null
  created_at: string
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const inFlightRef = useRef(false)

  const fetchCategories = useCallback(async () => {
    if (inFlightRef.current) return

    try {
      inFlightRef.current = true
      setIsLoading(true)
      setError(null)

      const res = await fetch('/api/admin/categories', { credentials: 'include' })

      if (!mountedRef.current) return

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData?.error || `Failed to fetch categories (${res.status})`)
      }

      const data = await res.json()
      if (mountedRef.current) {
        setCategories(data.categories || [])
      }
    } catch (err: any) {
      if (mountedRef.current) setError(err.message)
    } finally {
      inFlightRef.current = false
      if (mountedRef.current) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    fetchCategories()
    return () => { mountedRef.current = false }
  }, [fetchCategories])

  // Auto-retry: if loading stays stuck for 5s, retry
  useEffect(() => {
    if (!isLoading) return
    const t = setTimeout(() => { if (mountedRef.current && isLoading) fetchCategories() }, 5000)
    return () => clearTimeout(t)
  }, [fetchCategories, isLoading])

  return {
    categories,
    isLoading,
    error,
    refetch: fetchCategories
  }
}
