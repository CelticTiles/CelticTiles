'use client'

import { useEffect, useRef } from 'react'

interface ConfirmOrderEmailProps {
  orderNumber: string
}

/**
 * Client component that calls /api/orders/confirm ONCE on mount.
 * Handles: Stripe payment verification + email sending in a single API call.
 * Uses a ref to prevent duplicate calls from React StrictMode / re-renders.
 */
export function ConfirmOrderEmail({ orderNumber }: ConfirmOrderEmailProps) {
  const calledRef = useRef(false)

  useEffect(() => {
    // Prevent duplicate calls (React StrictMode, re-renders, etc.)
    if (calledRef.current) return
    calledRef.current = true

    fetch('/api/orders/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderNumber }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.email?.sent) {
          console.log('[ConfirmOrderEmail] ✅ Confirmation email sent')
        } else if (data.email?.alreadySent) {
          console.log('[ConfirmOrderEmail] ✅ Email already sent (skipped)')
        }
        if (data.paymentVerified) {
          console.log('[ConfirmOrderEmail] ✅ Payment verified, intent:', data.paymentIntentId)
        }
      })
      .catch((err) => {
        console.error('[ConfirmOrderEmail] API call failed:', err)
      })
  }, [orderNumber])

  return null
}
