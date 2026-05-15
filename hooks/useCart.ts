"use client"

import { useEffect, useState, useRef, useCallback } from 'react'
import useStore from "@/hooks/useStore"
import {
  fetchCartAction,
  addToCartAction,
  updateCartQuantityAction,
  removeFromCartAction,
  clearCartAction,
  type CartItem,
  type AddToCartInput
} from "@/app/actions/cart"

export type { CartItem }

export function useCart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get user from Zustand store
  const storeUser = useStore((state) => state.user)
  const setCartCountInStore = useStore((state) => state.setCartCount)
  const setCartItemsInStore = useStore((state) => state.setCartItems)
  const hasHydrated = useStore((state) => state._hasHydrated)
  
  // Track previous user ID to detect login/logout changes
  const prevUserIdRef = useRef<string | null | undefined>(undefined)

  // Helper: build per-product cart map and sync to store
  const syncCartToStore = useCallback((items: CartItem[]) => {
    setCartItems(items)
    const count = items.reduce((sum, item) => sum + item.quantity, 0)
    setCartCountInStore(count)
    const map: Record<string, { cartItemId: string; quantity: number }> = {}
    for (const item of items) {
      if (map[item.product_id]) {
        map[item.product_id].quantity += item.quantity
      } else {
        map[item.product_id] = { cartItemId: item.id, quantity: item.quantity }
      }
    }
    setCartItemsInStore(map)
  }, [setCartCountInStore, setCartItemsInStore])

  const refreshCart = useCallback(async () => {
    const { data, error: fetchError } = await fetchCartAction()

    if (fetchError || !data) {
      console.error('[useCart] Error fetching cart:', fetchError)
      setError(fetchError || 'Failed to load cart')
      syncCartToStore([])
      return
    }

    syncCartToStore(data)
  }, [syncCartToStore])

  const getErrorMessage = useCallback((error: unknown, fallback: string) => {
    return error instanceof Error ? error.message : fallback
  }, [])

  // Fetch cart when hydrated and when user changes
  useEffect(() => {
    if (!hasHydrated) return
    
    const currentUserId = storeUser?.id || null
    
    // Skip if user hasn't changed (but not on first run)
    if (prevUserIdRef.current !== undefined && prevUserIdRef.current === currentUserId) {
      return
    }
    prevUserIdRef.current = currentUserId

    const fetchCart = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // No user = empty cart
        if (!currentUserId) {
          syncCartToStore([])
          setIsLoading(false)
          return
        }

        await refreshCart()
      } catch (err: unknown) {
        console.error('[useCart] Exception fetching cart:', err)
        setError(getErrorMessage(err, 'Failed to load cart'))
        syncCartToStore([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchCart()
  }, [getErrorMessage, hasHydrated, refreshCart, storeUser?.id, syncCartToStore])

  async function addToCart(item: AddToCartInput): Promise<CartItem | undefined> {
    try {
      if (!storeUser?.id) {
        throw new Error('Must be logged in to add to cart')
      }

      const { data, error: addError } = await addToCartAction(item)

      if (addError || !data) {
        console.error('[useCart] Add to cart error:', addError)
        throw new Error(addError || 'Failed to add to cart')
      }

      // Refresh cart to get updated state
      await refreshCart()

      return data
    } catch (err: unknown) {
      console.error('[useCart] Exception in addToCart:', err)
      throw err
    }
  }

  async function updateQuantity(id: string, quantity: number): Promise<CartItem | void> {
    try {
      const { data, error: updateError } = await updateCartQuantityAction(id, quantity)

      if (updateError) {
        console.error('[useCart] Update quantity error:', updateError)
        throw new Error(updateError)
      }

      // Refresh cart to get updated state
      await refreshCart()

      return data || undefined
    } catch (err: unknown) {
      console.error('[useCart] Exception in updateQuantity:', err)
      throw err
    }
  }

  async function removeFromCart(id: string) {
    try {
      const { success, error: removeError } = await removeFromCartAction(id)

      if (!success || removeError) {
        console.error('[useCart] Remove from cart error:', removeError)
        throw new Error(removeError || 'Failed to remove from cart')
      }

      // Refresh cart to get updated state
      await refreshCart()
    } catch (err: unknown) {
      console.error('[useCart] Exception in removeFromCart:', err)
      throw err
    }
  }

  async function clearCart() {
    try {
      if (!storeUser?.id) return

      const { success, error: clearError } = await clearCartAction()

      if (!success || clearError) {
        console.error('[useCart] Clear cart error:', clearError)
        throw new Error(clearError || 'Failed to clear cart')
      }

      syncCartToStore([])
    } catch (err: unknown) {
      console.error('[useCart] Exception in clearCart:', err)
      throw err
    }
  }

  function getCartTotal() {
    return cartItems.reduce((sum, item) => sum + (item.product_price * item.quantity), 0)
  }

  function getCartCount() {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0)
  }

  return {
    cartItems,
    isLoading,
    error,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    getCartTotal,
    getCartCount,
  }
}
