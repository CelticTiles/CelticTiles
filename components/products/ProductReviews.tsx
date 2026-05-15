'use client'

import { useProductReviews, Review } from '@/hooks/useProductReviews'
import { formatDistanceToNow } from 'date-fns'

interface ProductReviewsProps {
  productId: string
}

const renderStars = (rating: number | null) => {
  if (!rating) return <span className="text-gray-500">No rating</span>

  const fullStars = Math.floor(rating)
  const hasHalf = rating % 1 >= 0.5
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0)

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {/* Full stars */}
        {Array(fullStars)
          .fill(null)
          .map((_, i) => (
            <span key={`full-${i}`} className="text-yellow-400 text-lg">
              ⭐
            </span>
          ))}

        {/* Half star */}
        {hasHalf && <span className="text-yellow-400 text-lg">⭐</span>}

        {/* Empty stars */}
        {Array(emptyStars)
          .fill(null)
          .map((_, i) => (
            <span key={`empty-${i}`} className="text-gray-300 text-lg">
              ☆
            </span>
          ))}
      </div>

      <span className="text-sm font-semibold text-gray-700">
        {rating.toFixed(1)}
      </span>
    </div>
  )
}

export const ProductReviews = ({ productId }: ProductReviewsProps) => {
  const { reviews, loading, error, averageRating } = useProductReviews(productId)

  if (loading) {
    return (
      <div className="py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">Error loading reviews: {error}</p>
      </div>
    )
  }

  if (!reviews || reviews.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-gray-600 mb-4">No reviews yet for this product.</p>
        <p className="text-sm text-gray-500">Be the first to review this product!</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Reviews Header with Average Rating */}
      <div className="pb-6 border-b">
        <h2 className="text-2xl font-bold mb-4 text-tm-text font-serif">Customer Reviews</h2>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-100">
          <div className="flex items-center gap-6">
            <div>
              <div className="text-5xl font-bold text-gray-800">{averageRating.toFixed(1)}</div>
              <div className="text-sm text-gray-600 mt-1">/5.0</div>
            </div>

            <div className="flex-1">
              <div className="mb-3">
                {renderStars(averageRating)}
              </div>
              <p className="text-sm text-gray-600">
                Based on <span className="font-semibold">{reviews.length}</span> verified{' '}
                {reviews.length === 1 ? 'review' : 'reviews'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Individual Reviews */}
      <div className="space-y-4">
        {reviews.map((review: Review) => (
          <div key={review.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
            {/* Review Header */}
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-semibold text-gray-800">{review.customer_name}</p>
                <p className="text-xs text-gray-500">
                  {review.created_at
                    ? formatDistanceToNow(new Date(review.created_at), { addSuffix: true })
                    : 'Recently'}
                </p>
              </div>
              <div>{renderStars(review.rating)}</div>
            </div>

            {/* Review Comment */}
            <p className="text-gray-700 mb-3 leading-relaxed">{review.comment}</p>

            {/* Admin Response if exists */}
            {review.admin_response && (
              <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                <p className="text-xs font-semibold text-blue-900 mb-1">Admin Response:</p>
                <p className="text-sm text-blue-800">{review.admin_response}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Load More / Pagination Note */}
      {reviews.length >= 20 && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-600">Showing latest 20 reviews</p>
        </div>
      )}
    </div>
  )
}
