"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useCart } from "@/hooks/useCart"
import { formatPrice } from "@/lib/utils"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import Image from "next/image"
import { toast } from "sonner"
import { ArrowLeft, Loader2, Tag } from "lucide-react"
import Link from "next/link"
import type { UserAddress } from "@/hooks/useAddresses"
import type { Database } from "@/lib/supabase-types"

interface AppliedCoupon {
    code: string
    discount_type: 'percentage' | 'fixed'
    discount_value: number
}

interface SiteSettings {
    tax_rate: number
    free_shipping_threshold: number
    shipping_fee: number
}

interface CheckoutClientProps {
    isLoggedIn: boolean
    userRole: 'customer' | 'sales' | 'admin'
    initialAddresses: UserAddress[]
    initialProfile: { full_name: string | null; phone: string | null } | null
    userId: string | null
    siteSettings: SiteSettings
}

type CustomerAddressInsert = Database["public"]["Tables"]["customer_addresses"]["Insert"]
type CreatedOrder = Pick<Database["public"]["Tables"]["orders"]["Row"], "order_number">

export default function CheckoutClient({ isLoggedIn, userRole, initialAddresses, initialProfile, userId, siteSettings }: CheckoutClientProps) {
    const supabase = getSupabaseBrowserClient()
    const { cartItems, isLoading: cartLoading, clearCart, getCartTotal } = useCart()
    const router = useRouter()
    const searchParams = useSearchParams()
    const isQuoteMode = searchParams.get("mode") === "quote"
    const [quoteData, setQuoteData] = useState<any>(null)
    const [isProcessing, setIsProcessing] = useState(false)

    const [addresses] = useState<UserAddress[]>(initialAddresses)
    const [selectedAddressId, setSelectedAddressId] = useState<string>("")
    const [useNewAddress, setUseNewAddress] = useState(initialAddresses.length === 0)

    // ✅ Pre-fill billing from server-fetched profile
    const [formData, setFormData] = useState({
        full_name: initialProfile?.full_name ?? "",
        email: "",
        phone: initialProfile?.phone ?? "",
        street: "",
        city: "",
        state: "",
        pincode: "",
        payment: "card"
    })

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null)

    // Load quote data from sessionStorage when in quote mode
    useEffect(() => {
        if (!isQuoteMode) return
        try {
            const stored = sessionStorage.getItem("quoteCheckout")
            if (stored) {
                const parsed = JSON.parse(stored)
                setQuoteData(parsed)
                // Pre-fill all customer + delivery details from quote
                setFormData(prev => ({
                    ...prev,
                    full_name: parsed.customerName || prev.full_name,
                    email: parsed.customerEmail || prev.email,
                    phone: parsed.customerPhone || prev.phone,
                    street: parsed.deliveryAddress?.street || prev.street,
                    city: parsed.deliveryAddress?.city || prev.city,
                    state: parsed.deliveryAddress?.state || parsed.deliveryAddress?.city || prev.state,
                    pincode: parsed.deliveryAddress?.pincode || prev.pincode,
                }))
            } else {
                toast.error("Quote data not found. Please go back.")
                router.push("/quotecart")
            }
        } catch {
            router.push("/quotecart")
        }
    }, [isQuoteMode])

    const cartSubtotal = getCartTotal()
    const subtotal = isQuoteMode && quoteData ? quoteData.total : cartSubtotal
    const taxRate = (siteSettings.tax_rate ?? 0) / 100

    const couponDiscount = !isQuoteMode && appliedCoupon
        ? appliedCoupon.discount_type === 'percentage'
            ? subtotal * (appliedCoupon.discount_value / 100)
            : Math.min(appliedCoupon.discount_value, subtotal)
        : 0
    const discountedSubtotal = subtotal - couponDiscount
    const tax = discountedSubtotal * taxRate
    const isFreeShipping = discountedSubtotal > siteSettings.free_shipping_threshold
    const shippingFee = 0
    const total = isQuoteMode && quoteData ? quoteData.total : discountedSubtotal + tax + shippingFee

    // Load applied coupon from sessionStorage (set in cart page)
    useEffect(() => {
        if (isQuoteMode) return
        try {
            const stored = sessionStorage.getItem('appliedCoupon')
            if (stored) setAppliedCoupon(JSON.parse(stored))
        } catch {}
    }, [])

    // Pre-fill email from auth session — only for normal cart mode
    useEffect(() => {
        if (isQuoteMode) return
        supabase.auth.getSession().then((result) => {
            if (!result) return
            const email = result.data?.session?.user?.email
            if (email) setFormData(prev => ({ ...prev, email }))
        }).catch(() => {})
    }, [supabase, isQuoteMode])

    // Auto-select default (or first) saved address on mount — skip in quote mode
    useEffect(() => {
        if (isQuoteMode || addresses.length === 0) return
        const defaultAddress = addresses.find(a => a.is_default) ?? addresses[0]
        handleAddressSelection(defaultAddress.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // ✅ BULLETPROOF: Auto-fill form via State Update (Using exact DB fields)
    const handleAddressSelection = (addressId: string) => {
        setSelectedAddressId(addressId)
        const address = addresses.find(a => a.id === addressId)
        
        if (address) {
            setFormData(prev => ({
                ...prev,
                full_name: address.full_name,
                street: address.street,
                city: address.city,
                state: address.state,
                pincode: address.pincode,
                phone: address.phone
            }))

            setUseNewAddress(false)
            toast.success(`✅ Address loaded: ${address.full_name}`)
        } else {
            console.error('[Checkout] ❌ Address not found in list')
        }
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsProcessing(true)



        // Set timeout to prevent infinite loading (30 seconds)
        const timeoutId = setTimeout(() => {
            setIsProcessing(false)
            toast.error("Checkout took too long. Please try again.")
        }, 60000)

        try {
            // Get data from Controlled State instead of DOM
            const {
                full_name,
                email,
                phone,
                street,
                city,
                state,
                pincode,
                payment: paymentMethod
            } = formData;

            // Validate required fields
            if (!full_name || !email || !phone || !street || !city || !state || !pincode) {
                clearTimeout(timeoutId)

                toast.error("Please fill in all required fields")
                setIsProcessing(false)
                return
            }

            // Use cached userId from state (fetched on mount) - avoids AbortError
            if (!userId) {
                clearTimeout(timeoutId)

                toast.error("You must be logged in to place an order")
                router.push("/login")
                setIsProcessing(false)
                return
            }



            // Create delivery address as JSONB object
            const deliveryAddressObj = {
                street: street,
                city: city,
                state: state,
                pincode: pincode,
                country: "Ireland"
            }

            // ✅ STEP 0: Save address to customer_addresses table (non-blocking)
            const addressPayload: CustomerAddressInsert = {
                user_id: userId,
                full_name: full_name,
                street: street,
                city: city,
                state: state,
                pincode: pincode,
                country: "Ireland",
                phone: phone,
                is_default: false,
                label: null
            }

            // Save address non-blocking — skip in quote mode (address comes from quote)
            if (!isQuoteMode) {
                try {
                    const { data: existing } = await supabase
                        .from('customer_addresses')
                        .select('id')
                        .eq('user_id', userId)
                        .eq('street', street)
                        .eq('city', city)
                        .eq('pincode', pincode)
                        .limit(1)

                    if (!existing || existing.length === 0) {
                        await supabase.from('customer_addresses').insert([addressPayload])
                    }
                } catch (addrErr) {
                    console.warn('[Checkout] Address save failed (non-blocking):', addrErr)
                }
            }

            // In quote mode, read fresh from sessionStorage at submit time
            // so we are never blocked by stale React state from useEffect timing
            let liveQuoteData: any = quoteData
            if (isQuoteMode && !liveQuoteData) {
                try {
                    const stored = sessionStorage.getItem("quoteCheckout")
                    if (stored) liveQuoteData = JSON.parse(stored)
                } catch {}
            }

            if (isQuoteMode && !liveQuoteData) {
                clearTimeout(timeoutId)
                toast.error("Quote data lost. Please go back to the quote cart.")
                router.push("/quotecart")
                setIsProcessing(false)
                return
            }

            const quoteSnapshot = isQuoteMode && liveQuoteData ? {
                items: liveQuoteData.items.filter((i: any) => i.type === "product").map((i: any) => ({
                    product_id: i.product_id || "",
                    product_name: i.description || i.product_name || "Item",
                    quantity: Number(i.quantity) || 0,
                    unit_price: Number(i.unit_price) || 0,
                    subtotal: Number(i.amount) || Number(i.subtotal) || (Number(i.unit_price) * Number(i.quantity)) || 0,
                })),
                subtotal: liveQuoteData.subtotal,
                tax: 0,
                shipping_fee: 0,
                discount: liveQuoteData.quoteDiscount ?? 0,
                coupon_code: null,
                total: liveQuoteData.total,
            } : null

            const checkoutPayload: Record<string, any> = {
                paymentMethod,
                couponCode: isQuoteMode ? null : (appliedCoupon?.code ?? null),
                customer: { full_name, email, phone },
                deliveryAddress: { street, city, state, pincode, country: "Ireland" },
                ...(isQuoteMode && liveQuoteData ? {
                    quoteId: liveQuoteData.quoteId,
                    quoteSnapshot,
                } : {}),
            }

            // Card payment: create Stripe session first, then persist server-calculated order.
            if (paymentMethod === 'card') {
                try {
                    const stripeResponse = await fetch('/api/create-stripe-session', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            couponCode: isQuoteMode ? null : (appliedCoupon?.code ?? null),
                            ...(isQuoteMode && liveQuoteData ? {
                                quoteId: liveQuoteData.quoteId,
                                quoteSnapshot,
                            } : {}),
                        })
                    })

                    if (!stripeResponse.ok) {
                        const errorData = await stripeResponse.json().catch(() => ({ error: 'Payment service unavailable' }))
                        clearTimeout(timeoutId)
                        console.error('[Checkout] Stripe session failed:', errorData)
                        toast.error('Payment could not be initialized: ' + (errorData.error || 'Please try again.'))
                        setIsProcessing(false)
                        return
                    }

                    const { url, sessionId } = await stripeResponse.json()

                    if (!url || !sessionId) {
                        clearTimeout(timeoutId)
                        toast.error('Payment gateway returned an invalid response. Please try again.')
                        setIsProcessing(false)
                        return
                    }

                    const orderRes = await fetch('/api/checkout/create-order', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ...checkoutPayload,
                            stripeSessionId: sessionId,
                        })
                    })

                    if (!orderRes.ok) {
                        const errData = await orderRes.json().catch(() => ({}))
                        clearTimeout(timeoutId)
                        console.error('[Checkout] Order creation failed after Stripe:', errData)
                        toast.error('Order could not be saved. Please contact support.')
                        setIsProcessing(false)
                        return
                    }

                    clearTimeout(timeoutId)
                    sessionStorage.removeItem('appliedCoupon')
                    toast.success('Redirecting to payment...')
                    window.location.href = url
                    return
                } catch (stripeError: unknown) {
                    clearTimeout(timeoutId)
                    const message = stripeError instanceof Error ? stripeError.message : 'Unknown Stripe error'
                    console.error('[Checkout] Stripe error:', message)
                    toast.error('Payment failed. Please check your connection and try again.')
                    setIsProcessing(false)
                    return
                }
            }

            // Offline payment (admin/sales only): server validates permissions and performs stock deduction.
            const offlineOrderRes = await fetch('/api/checkout/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(checkoutPayload)
            })

            if (!offlineOrderRes.ok) {
                const errData = await offlineOrderRes.json().catch(() => ({}))
                clearTimeout(timeoutId)
                console.error('Order creation error:', errData)
                toast.error('Failed to create order: ' + (errData.error || 'Unknown error'))
                setIsProcessing(false)
                return
            }

            const payload = await offlineOrderRes.json()
            const orderData = payload?.order as CreatedOrder | undefined

            if (!orderData) {
                clearTimeout(timeoutId)
                toast.error('Failed to create order. Please try again.')
                setIsProcessing(false)
                return
            }

            // Clear cart after successful offline order creation.
            try {
                await clearCart()
            } catch (cartError) {
                console.warn('[Checkout] Cart clear failed but order was created:', cartError)
            }
            // 5. Clear timeout and show success
            clearTimeout(timeoutId)
            toast.success("Order placed successfully! 🎉")
            

            // Small delay before redirect to allow success message to display
            setTimeout(() => {
                router.push(`/order/success?orderId=${orderData.order_number}`)
            }, 1500)
        } catch (err) {
            clearTimeout(timeoutId)
            console.error("Checkout error:", err)
            const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred"
            toast.error(errorMessage)
            setIsProcessing(false)
        }
    }

    // Not logged in state - handled by server, but kept as fallback
    if (!isLoggedIn) {
        return (
            <div className="text-center py-16">
                <h1 className="text-3xl font-bold text-primary mb-4">Please login to checkout</h1>
                <p className="text-muted-foreground mb-8">You need to be logged in to proceed to checkout.</p>
                <Button asChild>
                    <Link href="/login">Login</Link>
                </Button>
            </div>
        )
    }

    if (cartLoading) {
        return (
            <div className="text-center py-16">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading your cart...</p>
                <p className="text-xs text-muted-foreground mt-4">If this takes too long, please <button onClick={() => router.refresh()} className="underline text-primary">refresh the page</button></p>
            </div>
        )
    }

    if (!isQuoteMode && cartItems.length === 0) {
        return (
            <div className="text-center py-16">
                <h1 className="text-3xl font-bold text-primary mb-4">Your cart is empty</h1>
                <p className="text-muted-foreground mb-8">Add items to your cart before checkout.</p>
                <Button asChild>
                    <Link href="/tiles">Browse Products</Link>
                </Button>
            </div>
        )
    }

    return (
        <>
            <div className="flex items-center gap-4 mb-8">
                {isQuoteMode && (
                    <button
                        type="button"
                        onClick={() => router.push("/quotecart")}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                )}
                <h1 className="text-3xl font-serif font-bold text-primary">Checkout</h1>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Order Form */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Billing Details */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Billing Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Full Name *</label>
                                    <Input required placeholder="John Doe" name="full_name" value={formData.full_name} onChange={handleInputChange} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Email *</label>
                                    <Input type="email" required placeholder="john@example.com" name="email" value={formData.email} onChange={handleInputChange} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Phone *</label>
                                    <Input type="tel" required placeholder="+353 1 234 5678" name="phone" value={formData.phone} onChange={handleInputChange} />
                                </div>

                            </CardContent>
                        </Card>

                        {/* Saved Addresses Section */}
                        {!isQuoteMode && addresses.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        Saved Addresses
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {addresses.map((address) => (
                                        <button
                                            key={address.id}
                                            type="button"
                                            onClick={() => handleAddressSelection(address.id)}
                                            className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                                                selectedAddressId === address.id
                                                    ? 'border-primary bg-primary/5 shadow-sm'
                                                    : 'border-border hover:border-primary/40 hover:bg-muted/30'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <div className="font-semibold text-sm text-foreground">{address.full_name}</div>
                                                    <div className="text-sm text-muted-foreground mt-0.5">{address.street}</div>
                                                    <div className="text-sm text-muted-foreground">{address.city}, {address.state} {address.pincode}</div>
                                                    <div className="text-xs text-muted-foreground mt-1">{address.phone}</div>
                                                </div>
                                                <div
                                                    className={`w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-200 ${
                                                        selectedAddressId === address.id
                                                            ? 'bg-primary shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.1)]'
                                                            : 'bg-[#E5E9F0] shadow-[2px_2px_4px_rgba(0,0,0,0.1),-2px_-2px_4px_rgba(255,255,255,0.9)]'
                                                    }`}
                                                >
                                                    {selectedAddressId === address.id && (
                                                        <svg
                                                            className="w-2.5 h-2.5 text-white"
                                                            fill="none"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth="3"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                        >
                                                            <path d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </div>
                                            </div>
                                            {address.is_default && (
                                                <span className="inline-block mt-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Default</span>
                                            )}
                                        </button>
                                    ))}

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedAddressId("")
                                            setUseNewAddress(true)
                                            setFormData(prev => ({ ...prev, street: "", city: "", state: "", pincode: "" }))
                                        }}
                                        className={`w-full p-4 rounded-lg border-2 border-dashed text-sm font-medium transition-all ${
                                            !selectedAddressId
                                                ? 'border-primary text-primary bg-primary/5'
                                                : 'border-border text-muted-foreground hover:border-primary/40'
                                        }`}
                                    >
                                        + Enter a new address
                                    </button>
                                </CardContent>
                            </Card>
                        )}

                        {/* Delivery Address */}
                        <Card key={`delivery-${selectedAddressId || 'new'}`}>
                            <CardHeader>
                                <CardTitle>Delivery Address</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Street Address *</label>
                                    <Input required placeholder="123 Main Street" name="street" value={formData.street} onChange={handleInputChange} />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">City *</label>
                                        <Input required placeholder="Dublin" name="city" value={formData.city} onChange={handleInputChange} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">County/State *</label>
                                        <Input required placeholder="Dublin" name="state" value={formData.state} onChange={handleInputChange} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Postal Code *</label>
                                        <Input required placeholder="D02 XY12" name="pincode" value={formData.pincode} onChange={handleInputChange} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Payment Method */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Payment Method</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div 
                                    className={`border rounded-lg p-4 cursor-pointer transition-all ${formData.payment === 'card' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                                    onClick={() => setFormData(prev => ({ ...prev, payment: 'card' }))}
                                >
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <div className={`
                                            w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0
                                            transition-all duration-200
                                            ${formData.payment === 'card'
                                                ? 'bg-primary shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.1)]'
                                                : 'bg-[#E5E9F0] shadow-[2px_2px_4px_rgba(0,0,0,0.1),-2px_-2px_4px_rgba(255,255,255,0.9)]'
                                            }
                                        `}>
                                            {formData.payment === 'card' && (
                                                <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </div>
                                        <span className="font-medium">Credit/Debit Card</span>
                                    </label>
                                </div>
                                {(userRole === 'admin' || userRole === 'sales') && (
                                    <>
                                    <div 
                                        className={`border rounded-lg p-4 cursor-pointer transition-all ${formData.payment === 'offline_cash' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                                        onClick={() => setFormData(prev => ({ ...prev, payment: 'offline_cash' }))}
                                    >
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <div className={`
                                                w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0
                                                transition-all duration-200
                                                ${formData.payment === 'offline_cash'
                                                    ? 'bg-primary shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.1)]'
                                                    : 'bg-[#E5E9F0] shadow-[2px_2px_4px_rgba(0,0,0,0.1),-2px_-2px_4px_rgba(255,255,255,0.9)]'
                                                }
                                            `}>
                                                {formData.payment === 'offline_cash' && (
                                                    <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                            <span className="font-medium">In-store Cash Payment</span>
                                            <span className="text-xs text-muted-foreground">(Pay in store)</span>
                                        </label>
                                    </div>
                                    <div 
                                        className={`border rounded-lg p-4 cursor-pointer transition-all ${formData.payment === 'card_instore' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                                        onClick={() => setFormData(prev => ({ ...prev, payment: 'card_instore' }))}
                                    >
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 ${formData.payment === 'card_instore' ? 'bg-primary shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.1)]' : 'bg-[#E5E9F0] shadow-[2px_2px_4px_rgba(0,0,0,0.1),-2px_-2px_4px_rgba(255,255,255,0.9)]'}`}>
                                                {formData.payment === 'card_instore' && <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor"><path d="M5 13l4 4L19 7" /></svg>}
                                            </div>
                                            <span className="font-medium">In-store Card Payment</span>
                                            <span className="text-xs text-muted-foreground">(Card machine)</span>
                                        </label>
                                    </div>
                                    <div 
                                        className={`border rounded-lg p-4 cursor-pointer transition-all ${formData.payment === 'bank_transfer' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                                        onClick={() => setFormData(prev => ({ ...prev, payment: 'bank_transfer' }))}
                                    >
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 ${formData.payment === 'bank_transfer' ? 'bg-primary shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.1)]' : 'bg-[#E5E9F0] shadow-[2px_2px_4px_rgba(0,0,0,0.1),-2px_-2px_4px_rgba(255,255,255,0.9)]'}`}>
                                                {formData.payment === 'bank_transfer' && <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor"><path d="M5 13l4 4L19 7" /></svg>}
                                            </div>
                                            <span className="font-medium">Bank Transfer</span>
                                            <span className="text-xs text-muted-foreground">(Direct bank payment)</span>
                                        </label>
                                    </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column - Order Summary */}
                    <div className="lg:col-span-1">
                        <Card className="sticky top-24">
                            <CardHeader>
                                <CardTitle>Order Summary</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 mb-6">
                                    {isQuoteMode && quoteData ? (
                                        <>
                                            {quoteData.items.filter((i: any) => i.type === "product").slice(0, 3).map((item: any) => (
                                                <div key={item.id} className="flex gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-mono text-muted-foreground">{item.code}</p>
                                                        <p className="text-sm font-medium line-clamp-2">{item.description}</p>
                                                        <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                                                        <p className="text-sm font-bold text-primary mt-1">{formatPrice(item.amount)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {quoteData.items.filter((i: any) => i.type === "product").length > 3 && (
                                                <p className="text-sm text-muted-foreground text-center">
                                                    +{quoteData.items.filter((i: any) => i.type === "product").length - 3} more item(s)
                                                </p>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            {cartItems.slice(0, 3).map((item) => (
                                                <div key={item.id} className="flex gap-3">
                                                    <div className="relative w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                                                        <Image
                                                            src={item.product_image || '/images/placeholder.jpg'}
                                                            alt={item.product_name}
                                                            fill
                                                            className="object-cover"
                                                            sizes="64px"
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium line-clamp-2">{item.product_name}</p>
                                                        <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                                                        <p className="text-sm font-bold text-primary mt-1">{formatPrice(item.product_price * item.quantity)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {cartItems.length > 3 && (
                                                <p className="text-sm text-muted-foreground text-center">
                                                    +{cartItems.length - 3} more item(s)
                                                </p>
                                            )}
                                        </>
                                    )}
                                </div>

                                <div className="border-t border-border pt-4 space-y-2">
                                    {isQuoteMode && quoteData ? (
                                        <>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Items</span>
                                                <span className="font-medium">{formatPrice(quoteData.items.filter((i: any) => i.type === "product").reduce((s: number, i: any) => s + i.unit_price * i.quantity, 0))}</span>
                                            </div>
                                            {quoteData.items.some((i: any) => i.type === "product" && i.discount_percentage > 0) && (
                                                <div className="flex justify-between text-sm text-green-600">
                                                    <span>Item Discounts</span>
                                                    <span className="font-semibold">-{formatPrice(quoteData.items.filter((i: any) => i.type === "product").reduce((s: number, i: any) => s + (i.unit_price * i.quantity - i.amount), 0))}</span>
                                                </div>
                                            )}
                                            {quoteData.quoteDiscount > 0 && (
                                                <div className="flex justify-between text-sm text-green-600">
                                                    <span>Quote Discount ({quoteData.quoteDiscountPercentage}%)</span>
                                                    <span className="font-semibold">-{formatPrice(quoteData.quoteDiscount)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Delivery</span>
                                                <span className="font-medium">{quoteData.deliveryCollection}</span>
                                            </div>
                                            <p className="text-xs text-red-500 font-medium">* All prices include VAT</p>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Subtotal</span>
                                                <span className="font-medium">{formatPrice(subtotal)}</span>
                                            </div>
                                            {couponDiscount > 0 && appliedCoupon && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-green-600 flex items-center gap-1">
                                                        <Tag className="h-3 w-3" />
                                                        Coupon ({appliedCoupon.code})
                                                    </span>
                                                    <span className="font-semibold text-green-600">-{formatPrice(couponDiscount)}</span>
                                                </div>
                                            )}
                                            {siteSettings.tax_rate > 0 && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">VAT ({siteSettings.tax_rate}%)</span>
                                                    <span className="font-medium">{formatPrice(tax)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Delivery</span>
                                                <span className="font-medium">
                                                    {isFreeShipping ? <span className="text-green-600">Free</span> : <span className="text-red-600 text-xs">Quote required</span>}
                                                </span>
                                            </div>
                                            {!isFreeShipping && (
                                                <p className="text-xs text-red-600 leading-snug">
                                                    Delivery charge applies — please contact us for a quote.
                                                </p>
                                            )}
                                        </>
                                    )}
                                    <div className="flex justify-between font-bold border-t border-border pt-2 mt-2">
                                        <span>Total</span>
                                        <span className="text-primary">{formatPrice(total)}</span>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full mt-6 bg-primary hover:bg-primary-dark text-white h-12 text-lg font-semibold"
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        "Place Order"
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </form>
        </>
    )
}

