"use client"

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase'

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
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
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
      const result = await (supabase
        .from('categories') as any)
        .select('*')
        .order('name', { ascending: true })
      const { data, error } = result || {}

      if (!mountedRef.current) return
      if (error) throw error
      setCategories(data || [])
    } catch (err: any) {
      if (mountedRef.current) setError(err.message)
    } finally {
      inFlightRef.current = false
      if (mountedRef.current) setIsLoading(false)
    }
  }, [supabase])

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

  async function addCategory(category: Omit<Category, 'id' | 'created_at'>) {
    const result = await (supabase
      .from('categories') as any)
      .insert([category])
      .select()
      .single()
    const { data, error } = result || {}

    if (error) throw error
    setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    return data
  }

  async function updateCategory(id: string, updates: Partial<Category>) {
    const result = await (supabase
      .from('categories') as any)
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    const { data, error } = result || {}

    if (error) throw error
    setCategories(prev => prev.map(c => c.id === id ? data : c))
    return data
  }

  async function deleteCategory(id: string) {
    const result = await (supabase
      .from('categories') as any)
      .delete()
      .eq('id', id)
    const { error } = result || {}

    if (error) throw error
    setCategories(prev => prev.filter(c => c.id !== id))
  }

  return {
    categories,
    isLoading,
    error,
    addCategory,
    updateCategory,
    deleteCategory,
    refetch: fetchCategories
  }
}
