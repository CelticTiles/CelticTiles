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

        // Auto download bill/invoice copy if return path is available
        if (data.invoice?.path) {
          // Trigger download directly from storage uploads bucket using a download helper or storage url
          // Since it's a private storage bucket or public depending on config, we can fetch via client route or direct public URL.
          // Let's create an anchor element and trigger a download of the path: `/api/orders/${orderNumber}/invoice`
          const link = document.createElement('a')
          link.href = `/api/orders/${orderNumber}/invoice`
          link.setAttribute('download', `${orderNumber}.pdf`)
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }
      })
      .catch((err) => {
        console.error('[ConfirmOrderEmail] API call failed:', err)
      })
  }, [orderNumber])

  return null
}
