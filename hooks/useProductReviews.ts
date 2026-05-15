import { useEffect, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase'

// Module-level cache: stores the in-flight or resolved promise per productId.
// Shared between ProductReviews and ReviewsList so only one network request is made.
const reviewsFetchCache = new Map<string, Promise<Review[]>>()

export interface Review {
  id: string
  product_id: string
  customer_id: string
  customer_name: string
  customer_email: string
  rating: number
  comment: string
  status: 'pending' | 'published'
  admin_response: string | null
  created_at: string
  product_name?: string
}

interface UseProductReviewsResult {
  reviews: Review[]
  loading: boolean
  error: string | null
  averageRating: number
}

// Timeout helper: resolves with empty array after ms milliseconds
function fetchWithTimeout(fetchPromise: Promise<Review[]>, ms: number): Promise<Review[]> {
  const timeout = new Promise<Review[]>((resolve) =>
    setTimeout(() => resolve([]), ms)
  )
  return Promise.race([fetchPromise, timeout])
}

export const useProductReviews = (productId: string | null): UseProductReviewsResult => {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(!!productId) // true from the start if we have a productId
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!productId) {
      setReviews([])
      setLoading(false)
      setError(null)
      return
    }

    let isMounted = true
    setLoading(true)
    setError(null)

    const loadReviews = async () => {
      try {
        // Reuse in-flight or cached promise if already started
        let fetchPromise = reviewsFetchCache.get(productId)

        if (!fetchPromise) {
          fetchPromise = (async (): Promise<Review[]> => {
            try {
              const supabase = getSupabaseBrowserClient()
              const result = await (supabase
                .from('reviews') as any)
                .select('*')
                .eq('product_id', productId)
                .eq('status', 'published')
                .order('created_at', { ascending: false })
                .limit(20)

              if (!result || result.error) return []
              return (result.data as Review[]) || []
            } catch {
              return []
            }
          })()

          reviewsFetchCache.set(productId, fetchPromise)

          // Expire cache after 30 seconds so subsequent visits re-fetch
          setTimeout(() => reviewsFetchCache.delete(productId), 30000)
        }

        // Race against 8-second timeout — never hangs the page
        const data = await fetchWithTimeout(fetchPromise, 8000)

        if (isMounted) {
          setReviews(data)
          setLoading(false)
        }
      } catch {
        if (isMounted) {
          setReviews([])
          setLoading(false)
        }
      }
    }

    loadReviews()

    return () => {
      isMounted = false
    }
  }, [productId])

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + (review.rating || 0), 0) / reviews.length
      : 0

  return { reviews, loading, error, averageRating }
}
