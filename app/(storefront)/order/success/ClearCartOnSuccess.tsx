'use client'

import { useEffect } from 'react'
import { clearCartAction } from '@/app/actions/cart'
import { useStore } from '@/hooks/useStore'

export function ClearCartOnSuccess() {
  const setCartCount = useStore((s) => s.setCartCount)
  const setCartItems = useStore((s) => s.setCartItems)

  useEffect(() => {
    clearCartAction().then(() => {
      setCartCount(0)
      setCartItems({})
    }).catch(() => {})
  }, [setCartCount, setCartItems])

  return null
}
