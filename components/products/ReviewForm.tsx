'use client'

import { useState, useEffect } from 'react'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useStore } from '@/hooks/useStore'

interface ReviewFormProps {
    productId: string
    productName: string
    onReviewSubmitted?: () => void
}

export function ReviewForm({ productId, productName, onReviewSubmitted }: ReviewFormProps) {
    const user = useStore((state) => state.user)
    const supabase = getSupabaseBrowserClient()

    const [rating, setRating] = useState(0)
    const [hoveredRating, setHoveredRating] = useState(0)
    const [comment, setComment] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    // null = still checking, true = purchased, false = not purchased
    const [hasPurchased, setHasPurchased] = useState<boolean | null>(null)

    useEffect(() => {
        if (!user) {
            setHasPurchased(null)
            return
        }

        const checkPurchase = async () => {
            try {
                console.log('[ReviewForm] Checking purchase for user:', user.id, 'product:', productId)
                
                // Query orders where:
                // 1. user_id matches the logged-in user
                // 2. payment was completed (Paid)
                // 3. items JSONB array contains an entry with this product_id
                const { data, error } = await (supabase
                    .from('orders') as any)
                    .select('id, payment_status, items')
                    .eq('user_id', user.id)
                    .eq('payment_status', 'Paid')
                    .limit(10)

                console.log('[ReviewForm] Orders query result:', { data, error, count: data?.length })
                
                if (error) {
                    console.error('[ReviewForm] Purchase check error:', error)
                    setHasPurchased(false)
                    return
                }

                // Manual check: does any paid order contain this product?
                const hasProduct = (data || []).some((order: any) => {
                    const items = order.items || []
                    return items.some((item: any) => item.product_id === productId)
                })
                
                console.log('[ReviewForm] Has purchased this product:', hasProduct)
                setHasPurchased(hasProduct)
            } catch (err) {
                console.error('[ReviewForm] Purchase check exception:', err)
                setHasPurchased(false)
            }
        }

        checkPurchase()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, productId])

    // Not logged in
    if (!user) {
        return (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                    <strong>Please log in</strong> to write a review for this product.
                </p>
            </div>
        )
    }

    // Still verifying purchase
    if (hasPurchased === null) {
        return (
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
        )
    }

    // Logged in but has not purchased — render nothing
    if (!hasPurchased) {
        return null
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        if (rating === 0) {
            toast.error('Please select a rating')
            return
        }

        if (comment.trim().length < 10) {
            toast.error('Comment must be at least 10 characters')
            return
        }

        setIsSubmitting(true)
        try {
            // Fetch full_name from profiles to ensure customer_name is always set
            let customerName = user.name || null
            if (!customerName) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', user.id)
                    .single()
                customerName = (profile as any)?.full_name || null
            }

            const { error } = await (supabase
                .from('reviews') as any)
                .insert([{
                    product_id: productId,
                    product_name: productName,
                    customer_id: user.id,
                    customer_name: customerName,
                    customer_email: user.email,
                    rating,
                    comment: comment.trim(),
                    status: 'pending',
                }])

            if (error) {
                toast.error(error.message || 'Failed to submit review')
                return
            }

            toast.success('Review submitted! Pending admin approval.')
            setRating(0)
            setComment('')
            onReviewSubmitted?.()
        } catch (err) {
            console.error('Review submission error:', err)
            toast.error('An error occurred while submitting your review')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="bg-gray-50 rounded-lg p-6 mb-8 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Write a Review</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Rating Stars */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Rating <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                onMouseEnter={() => setHoveredRating(star)}
                                onMouseLeave={() => setHoveredRating(0)}
                                className="transition-transform hover:scale-110"
                            >
                                <Star
                                    className={`w-8 h-8 transition-colors ${
                                        (hoveredRating || rating) >= star
                                            ? 'fill-yellow-400 text-yellow-400'
                                            : 'text-gray-300'
                                    }`}
                                />
                            </button>
                        ))}
                    </div>
                    {rating > 0 && (
                        <p className="mt-1 text-sm text-gray-600">
                            {rating === 1 && 'Poor'}
                            {rating === 2 && 'Fair'}
                            {rating === 3 && 'Good'}
                            {rating === 4 && 'Very Good'}
                            {rating === 5 && 'Excellent'}
                        </p>
                    )}
                </div>

                {/* Comment */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Your Review <span className="text-red-500">*</span>
                    </label>
                    <Textarea
                        placeholder="Share your experience with this product..."
                        value={comment}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setComment(e.target.value)}
                        rows={4}
                        className="w-full rounded-lg border border-gray-300 p-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tm-red"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        {comment.length} / 1000 characters
                    </p>
                </div>

                {/* Submit */}
                <div className="flex gap-2">
                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-tm-red hover:bg-tm-red/90 text-white font-bold rounded-lg py-2 px-6 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Review'}
                    </Button>
                    <p className="text-xs text-gray-500 self-center">
                        Reviews are moderated before publishing
                    </p>
                </div>
            </form>
        </div>
    )
}
