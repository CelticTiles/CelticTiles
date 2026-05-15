"use client"

import Image from 'next/image'
import Link from 'next/link'
import { useState, useMemo } from 'react'
import { formatPrice } from '@/lib/utils'
import { updateCartQuantityAction, removeFromCartAction } from '@/app/actions/cart'
import { Minus, Plus, Trash2, Loader2, ShoppingCart, ArrowLeft, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { PopularProducts } from '@/components/products/PopularProducts'
import { useStore } from '@/hooks/useStore'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase-types'

interface CartItem {
    id: string
    product_id: string
    variant_id: string | null
    product_name: string
    product_price: number
    product_image: string | null
    product_slug: string
    quantity: number
}

interface SiteSettings {
    tax_rate: number
    free_shipping_threshold: number
    shipping_fee: number
}

interface CartClientProps {
    initialCart: CartItem[]
    isLoggedIn: boolean
    siteSettings: SiteSettings
}

interface AppliedCoupon {
    code: string
    discount_type: 'percentage' | 'fixed'
    discount_value: number
}

type CouponRow = Pick<
    Database['public']['Tables']['coupons']['Row'],
    'code' | 'discount_type' | 'discount_value' | 'expires_at' | 'usage_limit' | 'used_count' | 'min_order_value'
>

function getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) return error.message
    return fallback
}

export default function CartClient({ initialCart, isLoggedIn, siteSettings }: CartClientProps) {
    const [items, setItems] = useState<CartItem[]>(initialCart)
    const [updatingId, setUpdatingId] = useState<string | null>(null)
    const setCartCount = useStore((state) => state.setCartCount)
    const setCartItems = useStore((state) => state.setCartItems)

    // Coupon state
    const [couponCode, setCouponCode] = useState("")
    const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null)
    const [couponLoading, setCouponLoading] = useState(false)

    const total = useMemo(
        () => items.reduce((sum, item) => sum + item.product_price * item.quantity, 0),
        [items]
    )

    const itemCount = useMemo(
        () => items.reduce((sum, item) => sum + item.quantity, 0),
        [items]
    )

    const discount = useMemo(() => {
        if (!appliedCoupon) return 0
        if (appliedCoupon.discount_type === 'percentage') {
            return total * (appliedCoupon.discount_value / 100)
        }
        return Math.min(appliedCoupon.discount_value, total)
    }, [appliedCoupon, total])

    const isFreeShipping = total >= siteSettings.free_shipping_threshold
    const shipping = isFreeShipping ? 0 : 0 // Below threshold: no flat fee, quote needed
    const finalTotal = total - discount + shipping

    // Coupon validation with timeout to prevent infinite loading
    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return
        setCouponLoading(true)
        try {
            const supabase = getSupabaseBrowserClient()
            const abortController = new AbortController()
            const timeoutId = setTimeout(() => abortController.abort(), 10000)

            const { data, error } = await supabase
                .from('coupons')
                .select('code, discount_type, discount_value, expires_at, usage_limit, used_count, min_order_value')
                .eq('code', couponCode.trim().toUpperCase())
                .eq('status', 'active')
                .abortSignal(abortController.signal)
                .single()

            clearTimeout(timeoutId)

            if (error || !data) {
                toast.error('Invalid or expired coupon code')
                return
            }

            const typedCoupon: CouponRow = data

            // Check expiry - normalise bare date strings to end-of-day so coupon is valid the full day
            if (typedCoupon.expires_at) {
                let expiryDate = new Date(typedCoupon.expires_at)
                // If stored as bare date (no time component), treat as end-of-day UTC
                if (!typedCoupon.expires_at.includes('T')) {
                    expiryDate = new Date(`${typedCoupon.expires_at}T23:59:59.999Z`)
                }
                if (expiryDate < new Date()) {
                    toast.error('This coupon has expired')
                    return
                }
            }

            // Check usage limit
            const usageLimit = typedCoupon.usage_limit ?? null
            const usedCount = typedCoupon.used_count ?? 0
            if (usageLimit !== null && usedCount >= usageLimit) {
                toast.error('This coupon has reached its usage limit')
                return
            }

            // Check minimum order value
            if (typedCoupon.min_order_value && total < typedCoupon.min_order_value) {
                toast.error(`Minimum order of ${formatPrice(typedCoupon.min_order_value)} required`)
                return
            }

            if (typedCoupon.discount_type !== 'percentage' && typedCoupon.discount_type !== 'fixed') {
                toast.error('This coupon is misconfigured')
                return
            }

            const coupon: AppliedCoupon = {
                code: typedCoupon.code,
                discount_type: typedCoupon.discount_type,
                discount_value: typedCoupon.discount_value
            }
            setAppliedCoupon(coupon)
            sessionStorage.setItem('appliedCoupon', JSON.stringify(coupon))
            toast.success(`Coupon "${typedCoupon.code}" applied!`)
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, 'Failed to validate coupon'))
        } finally {
            setCouponLoading(false)
        }
    }

    const handleRemoveCoupon = () => {
        setAppliedCoupon(null)
        setCouponCode("")
        sessionStorage.removeItem('appliedCoupon')
        toast.success('Coupon removed')
    }

    // Sync local state to Zustand store
    const syncToStore = (updatedItems: CartItem[]) => {
        const count = updatedItems.reduce((sum, item) => sum + item.quantity, 0)
        setCartCount(count)
        const map: Record<string, { cartItemId: string; quantity: number }> = {}
        for (const item of updatedItems) {
            if (map[item.product_id]) {
                map[item.product_id].quantity += item.quantity
            } else {
                map[item.product_id] = { cartItemId: item.id, quantity: item.quantity }
            }
        }
        setCartItems(map)
    }

    const handleUpdateQuantity = async (cartItemId: string, newQuantity: number) => {
        setUpdatingId(cartItemId)
        
        // Optimistic update
        const prevItems = [...items]
        if (newQuantity < 1) {
            const updated = items.filter(item => item.id !== cartItemId)
            setItems(updated)
            syncToStore(updated)
        } else {
            const updated = items.map(item =>
                item.id === cartItemId ? { ...item, quantity: newQuantity } : item
            )
            setItems(updated)
            syncToStore(updated)
        }

        try {
            if (newQuantity < 1) {
                const { error } = await removeFromCartAction(cartItemId)
                if (error) throw new Error(error)
                toast.success("Item removed from cart")
            } else {
                const { error } = await updateCartQuantityAction(cartItemId, newQuantity)
                if (error) throw new Error(error)
            }
        } catch (err) {
            // Rollback on error
            setItems(prevItems)
            syncToStore(prevItems)
            toast.error(err instanceof Error ? err.message : "Failed to update cart")
        } finally {
            setUpdatingId(null)
        }
    }

    const handleRemove = async (cartItemId: string) => {
        await handleUpdateQuantity(cartItemId, 0)
    }

    if (!isLoggedIn) {
        return (
            <div className="neu-raised rounded-[2rem] bg-[#E5E9F0] p-12 text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <ShoppingCart className="h-9 w-9 text-primary/60" />
                </div>
                <h2 className="text-2xl font-serif font-bold text-slate-800 mb-3">Sign in to view your cart</h2>
                <p className="text-slate-500 mb-8 max-w-sm mx-auto">Please log in to see items saved in your cart.</p>
                <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-3 text-white font-bold hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 shadow-lg"
                >
                    Sign In
                </Link>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div className="mb-8 border-b border-border pb-4">
                <h1 className="text-3xl font-serif font-bold text-primary mb-2">Shopping Cart</h1>
                <p className="text-muted-foreground">{itemCount} items in your cart</p>
            </div>
            <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
                {/* Cart Items */}
                <div className="space-y-4">
                    {items.length === 0 ? (
                        <div className="neu-raised rounded-[2rem] bg-[#E5E9F0] p-12 text-center">
                            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                                <ShoppingCart className="h-9 w-9 text-primary/60" />
                            </div>
                            <h2 className="text-2xl font-serif font-bold text-slate-800 mb-3">Your cart is empty</h2>
                            <p className="text-slate-500 mb-8 max-w-sm mx-auto">Browse products and add items to your cart.</p>
                            <Link
                                href="/"
                                className="inline-flex items-center gap-2 justify-center rounded-full bg-primary px-8 py-3 text-white font-bold hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 shadow-lg"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Continue Shopping
                            </Link>
                        </div>
                    ) : (
                        items.map((item) => {
                            const isUpdating = updatingId === item.id
                            return (
                                <div
                                    key={item.id}
                                    className={`neu-raised rounded-[1.5rem] bg-[#E5E9F0] p-5 flex items-center gap-5 transition-all duration-200 ${isUpdating ? 'opacity-60' : ''}`}
                                >
                                    {/* Product Image */}
                                    <Link href={`/product/${item.product_slug}`} className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-white">
                                        {item.product_image ? (
                                            <Image
                                                src={item.product_image}
                                                alt={item.product_name}
                                                fill
                                                className="object-cover"
                                                sizes="96px"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                <ShoppingCart className="h-8 w-8" />
                                            </div>
                                        )}
                                    </Link>

                                    {/* Product Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-slate-800 truncate text-sm">{item.product_name}</h3>
                                        <p className="text-sm text-slate-500 mt-1">
                                            {formatPrice(item.product_price)} each
                                        </p>

                                        {/* Quantity Controls */}
                                        <div className="flex items-center gap-2 mt-3">
                                            {/* Minus / Trash */}
                                            <button
                                                className="h-9 w-9 rounded-xl neu-raised bg-[#E5E9F0] flex items-center justify-center text-slate-600 hover:text-tm-red transition-colors disabled:opacity-40"
                                                onClick={() => item.quantity === 1
                                                    ? handleRemove(item.id)
                                                    : handleUpdateQuantity(item.id, item.quantity - 1)
                                                }
                                                disabled={isUpdating}
                                                title={item.quantity === 1 ? "Remove item" : "Decrease quantity"}
                                            >
                                                {isUpdating ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : item.quantity === 1 ? (
                                                    <Trash2 className="h-4 w-4" />
                                                ) : (
                                                    <Minus className="h-4 w-4" />
                                                )}
                                            </button>

                                            {/* Quantity */}
                                            <span className="w-10 text-center font-bold text-slate-800 text-sm tabular-nums">
                                                {item.quantity}
                                            </span>

                                            {/* Plus */}
                                            <button
                                                className="h-9 w-9 rounded-xl neu-raised bg-[#E5E9F0] flex items-center justify-center text-slate-600 hover:text-primary transition-colors disabled:opacity-40"
                                                onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                                disabled={isUpdating}
                                                title="Increase quantity"
                                            >
                                                <Plus className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Line Total */}
                                    <div className="text-right flex-shrink-0">
                                        <p className="font-bold text-lg text-slate-800">
                                            {formatPrice(item.product_price * item.quantity)}
                                        </p>
                                        {/* Remove button */}
                                        <button
                                            className="text-xs text-slate-400 hover:text-tm-red transition-colors mt-2 font-medium"
                                            onClick={() => handleRemove(item.id)}
                                            disabled={isUpdating}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>

                {/* Order Summary */}
                {items.length > 0 && (
                    <aside className="neu-raised rounded-[2rem] bg-[#E5E9F0] p-7 h-fit sticky top-24 space-y-5">
                        <h2 className="text-lg font-serif font-bold text-slate-800">Order Summary</h2>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500">Items ({itemCount})</span>
                                <span className="font-semibold text-slate-700">{formatPrice(total)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500">Delivery</span>
                                <span className="font-semibold">
                                    {isFreeShipping ? (
                                        <span className="text-green-600">Free</span>
                                    ) : (
                                        <span className="text-red-600 text-xs">Quote required</span>
                                    )}
                                </span>
                            </div>
                            {!isFreeShipping && (
                                <p className="text-xs text-red-600 leading-snug">
                                    Delivery charge applies — please contact us for a quote.
                                </p>
                            )}
                            {appliedCoupon && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-green-600 flex items-center gap-1">
                                        <Tag className="h-3 w-3" />
                                        Discount ({appliedCoupon.code})
                                    </span>
                                    <span className="font-semibold text-green-600">
                                        -{formatPrice(discount)}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Coupon Code Input */}
                        <div className="space-y-2">
                            {appliedCoupon ? (
                                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
                                    <div className="flex items-center gap-2">
                                        <Tag className="h-4 w-4 text-green-600" />
                                        <span className="text-sm font-semibold text-green-700">{appliedCoupon.code}</span>
                                        <span className="text-xs text-green-600">
                                            ({appliedCoupon.discount_type === 'percentage' 
                                                ? `${appliedCoupon.discount_value}% off` 
                                                : `${formatPrice(appliedCoupon.discount_value)} off`})
                                        </span>
                                    </div>
                                    <button
                                        onClick={handleRemoveCoupon}
                                        className="text-xs text-red-500 hover:text-red-700 font-medium"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={couponCode}
                                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                        placeholder="Coupon code"
                                        className="flex-1 px-4 py-2.5 text-sm rounded-xl neu-inset bg-[#E5E9F0] border-none focus:outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-slate-400"
                                        onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                                    />
                                    <Button
                                        onClick={handleApplyCoupon}
                                        disabled={couponLoading || !couponCode.trim()}
                                        size="sm"
                                        className="rounded-xl px-4"
                                    >
                                        {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="h-px bg-white/40" />

                        <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">Total</span>
                            <span className="text-xl font-bold text-slate-800">
                                {formatPrice(finalTotal)}
                            </span>
                        </div>

                        <Link
                            href="/checkout"
                            className="flex w-full items-center justify-center rounded-full bg-primary px-6 py-3.5 text-white font-bold hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-95 shadow-lg"
                        >
                            Proceed to Checkout
                        </Link>

                        <Link
                            href="/"
                            className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-slate-200 px-6 py-3 text-slate-600 font-bold hover:bg-white/60 transition-all text-sm"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Continue Shopping
                        </Link>
                    </aside>
                )}
            </div>

            {/* Popular Products Suggestions */}
            <PopularProducts
                title="You Might Also Like"
                limit={4}
                excludeProductIds={items.map(item => item.product_id)}
            />
        </div>
    )
}

