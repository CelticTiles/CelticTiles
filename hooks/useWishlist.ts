"use client"

import { useEffect, useState, useCallback, useRef } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import { useStore } from '@/hooks/useStore'
import type { Database } from '@/lib/supabase-types'

export interface WishlistItem {
  id: string
  user_id: string
  product_id: string
  created_at: string
}

type WishlistItemInsert = Database["public"]["Tables"]["wishlist_items"]["Insert"]

export function useWishlist() {
  const supabase = getSupabaseBrowserClient()
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Get the Zustand store setter and hydration state
  const setWishlistInStore = useStore((state) => state.setWishlist)
  const hasHydrated = useStore((state) => state._hasHydrated)
  
  // Track previous wishlist IDs to avoid unnecessary syncs
  const prevProductIdsRef = useRef<string[]>([])

  const fetchWishlist = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Get current user first
      const response = await supabase.auth.getUser()
      const user = response?.data?.user
      
      if (!user) {
        // Not logged in = empty wishlist
        setWishlistItems([])
        setIsLoading(false)
        return
      }

      // Filter by current user's ID only
      const result = await supabase
        .from('wishlist_items')
        .select('id, user_id, product_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      const { data, error: fetchError } = result || {}

      if (fetchError) throw fetchError
      setWishlistItems(data || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch wishlist')
      setWishlistItems([])
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  // Sync wishlist IDs to Zustand store ONLY after hydration and when data changes
  useEffect(() => {
    // Wait for Zustand to hydrate first
    if (!hasHydrated) return
    
    const productIds = wishlistItems.map(item => item.product_id)
    
    // Deep equality check - only sync if IDs actually changed
    const hasChanged = 
      productIds.length !== prevProductIdsRef.current.length ||
      productIds.some((id, i) => id !== prevProductIdsRef.current[i])
    
    if (hasChanged) {
      setWishlistInStore(productIds)
      prevProductIdsRef.current = productIds
    }
  }, [wishlistItems, hasHydrated, setWishlistInStore])

  useEffect(() => {
    fetchWishlist()
  }, [fetchWishlist])

  async function addToWishlist(productId: string) {
    const response = await supabase.auth.getUser()
    const user = response?.data?.user
    if (!user) throw new Error('Must be logged in')

    // Optimistic update
    const tempItem: WishlistItem = {
      id: 'temp-' + Date.now(),
      user_id: user.id,
      product_id: productId,
      created_at: new Date().toISOString()
    }

    setWishlistItems(prev => {
        if (prev.some(item => item.product_id === productId)) return prev
        return [tempItem, ...prev]
    })

    try {
        const payload: WishlistItemInsert = {
          user_id: user.id,
          product_id: productId
        }
        const { data, error } = await supabase
          .from('wishlist_items')
          .insert([payload])
          .select()
          .single()

        if (error) throw error
        
        // Replace temp item with real one
        setWishlistItems(prev => prev.map(item => 
            item.product_id === productId ? data : item
        ))
        
        return data
    } catch (err) {
        // Revert on error
        setWishlistItems(prev => prev.filter(item => item.product_id !== productId))
        throw err
    }
  }

  async function removeFromWishlist(productId: string) {
    const response = await supabase.auth.getUser()
    const user = response?.data?.user
    if (!user) return

    // Optimistic update
    const previousItems = [...wishlistItems]
    setWishlistItems(prev => prev.filter(item => item.product_id !== productId))

    try {
        const deleteResult = await supabase
          .from('wishlist_items')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', productId)
        const { error } = deleteResult || {}

        if (error) throw error
    } catch (err) {
        // Revert on error
        setWishlistItems(previousItems)
        throw err
    }
  }

  function isInWishlist(productId: string) {
    return wishlistItems.some(item => item.product_id === productId)
  }

  return {
    wishlistItems,
    isLoading,
    error,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    refetch: fetchWishlist
  }
}
