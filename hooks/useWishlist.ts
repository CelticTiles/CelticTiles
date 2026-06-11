"use client"

import { useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useStore } from '@/hooks/useStore'

export function useWishlist() {
  const supabase = getSupabaseBrowserClient()
  const wishlistIds = useStore((state) => state.wishlist)
  const setWishlist = useStore((state) => state.setWishlist)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function addToWishlist(productId: string) {
    const response = await supabase.auth.getUser()
    const user = response?.data?.user
    if (!user) throw new Error('Must be logged in')

    // Optimistic update
    const previous = [...wishlistIds]
    if (!previous.includes(productId)) {
        setWishlist([...previous, productId])
    }

    try {
        const { error: insertError } = await supabase
          .from('wishlist_items')
          .insert([{ user_id: user.id, product_id: productId }])

        if (insertError) throw insertError
    } catch (err) {
        // Revert on error
        setWishlist(previous)
        throw err
    }
  }

  async function removeFromWishlist(productId: string) {
    const response = await supabase.auth.getUser()
    const user = response?.data?.user
    if (!user) return

    // Optimistic update
    const previous = [...wishlistIds]
    setWishlist(previous.filter(id => id !== productId))

    try {
        const { error: deleteError } = await supabase
          .from('wishlist_items')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', productId)

        if (deleteError) throw deleteError
    } catch (err) {
        // Revert on error
        setWishlist(previous)
        throw err
    }
  }

  function isInWishlist(productId: string) {
    return wishlistIds.includes(productId)
  }

  async function fetchWishlist() {
      try {
          setIsLoading(true)
          const response = await supabase.auth.getUser()
          const user = response?.data?.user
          if (!user) {
              setWishlist([])
              return
          }
          const { data, error: fetchError } = await supabase
            .from('wishlist_items')
            .select('product_id')
            .eq('user_id', user.id)
            
          if (!fetchError && data) {
              setWishlist(data.map(d => d.product_id))
          } else if (fetchError) {
              setError(fetchError.message)
          }
      } catch (err: any) {
          setError(err.message || 'Failed to fetch wishlist')
      } finally {
          setIsLoading(false)
      }
  }

  return {
    wishlistItems: wishlistIds,
    isLoading,
    error,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    refetch: fetchWishlist
  }
}
