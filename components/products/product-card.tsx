"use client"

import Link from "next/link"
import Image from "next/image"
import { memo, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { formatPrice } from "@/lib/utils"
import { Heart, ShoppingCart, Loader2, Plus, Minus, Trash2, Calculator } from "lucide-react"

import { useStore } from "@/hooks/useStore"
import { useWishlist } from "@/hooks/useWishlist"
import { addToCartAction, updateCartQuantityAction, removeFromCartAction, fetchCartAction } from "@/app/actions/cart"
import { Button } from "@/components/ui/button"
import type { Product } from "@/lib/supabase-types"
import { toast } from "sonner"

export type ProductCardProduct = Pick<Product, "id" | "name" | "slug" | "price" | "image" | "stock" | "material"> & {
    sqm_per_box?: number | string | null
    coverage?: string | null
    panel_length?: string | null
    panel_width?: string | null
}

/** Mirrors the same check used in ProductClient.tsx */
function productHasCalculator(p: ProductCardProduct): boolean {
    const isWallPanel = !!(p.panel_length && p.panel_width) && !p.sqm_per_box && !p.coverage
    return !!(p.sqm_per_box || p.coverage || isWallPanel)
}

interface ProductCardProps {
    product: ProductCardProduct
    priority?: boolean
}

function withImageWidth(url: string | null | undefined, width = 300): string {
    if (!url) return '/images/placeholder.jpg'
    if (!/^https?:\/\//i.test(url)) return url

    try {
        const parsed = new URL(url)
        if (!parsed.searchParams.has('width')) {
            parsed.searchParams.set('width', width.toString())
        }
        return parsed.toString()
    } catch {
        const sep = url.includes('?') ? '&' : '?'
        return `${url}${sep}width=${width}`
    }
}

export const ProductCard = memo(function ProductCard({ product, priority = false }: ProductCardProps) {

    const router = useRouter()
    const { isInWishlist, user } = useStore()
    const setCartCount = useStore((state) => state.setCartCount)
    const setCartItems = useStore((state) => state.setCartItems)
    const cartQuantity = useStore((state) => state.getCartQuantity(product.id))
    const cartItemId = useStore((state) => state.getCartItemId(product.id))
    const { addToWishlist, removeFromWishlist } = useWishlist()
    const isWishlisted = isInWishlist(product.id)
    const isLoggedIn = !!user
    const hasCalculator = productHasCalculator(product)
    const [isAddingToCart, setIsAddingToCart] = useState(false)
    const [isUpdatingCart, setIsUpdatingCart] = useState(false)
    const [isTogglingWishlist, setIsTogglingWishlist] = useState(false)


    const syncCart = useCallback(async () => {
        const { data: refreshedCart } = await fetchCartAction()
        if (refreshedCart) {
            const count = refreshedCart.reduce((sum, item) => sum + item.quantity, 0)
            setCartCount(count)
            const map: Record<string, { cartItemId: string; quantity: number }> = {}
            for (const item of refreshedCart) {
                if (map[item.product_id]) {
                    map[item.product_id].quantity += item.quantity
                } else {
                    map[item.product_id] = { cartItemId: item.id, quantity: item.quantity }
                }
            }
            setCartItems(map)
        }
    }, [setCartCount, setCartItems])

    const handleWishlist = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        
        if (!isLoggedIn) {
            window.location.href = "/login"
            return
        }

        if (isTogglingWishlist) return
        setIsTogglingWishlist(true)

        try {
            if (isWishlisted) {
                await removeFromWishlist(product.id)
                toast.success("Removed from wishlist")
            } else {
                await addToWishlist(product.id)
                toast.success("Added to wishlist")
            }
        } catch (err: unknown) {
             toast.error(err instanceof Error ? err.message : "Failed to update wishlist")
        } finally {
            setIsTogglingWishlist(false)
        }
    }

    const handleAddToCart = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (product.stock === 0) {
            toast.error("This product is out of stock")
            return
        }

        if (!isLoggedIn) {
            window.location.href = "/login"
            return
        }

        // Products with a calculator must go through the product page
        // so the user can enter room dimensions before adding to cart.
        if (hasCalculator) {
            router.push(`/product/${product.slug}`)
            return
        }

        setIsAddingToCart(true)
        try {
            const { error: addError } = await addToCartAction({
                product_id: product.id,
                product_name: product.name,
                product_price: product.price || 0,
                product_image: product.image,
                quantity: 1
            })

            if (addError) throw new Error(addError)

            await syncCart()
            toast.success("Added to cart!")
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to add to cart")
        } finally {
            setIsAddingToCart(false)
        }
    }

    const handleIncrement = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        
        if (!cartItemId || isUpdatingCart) return
        const stock = product.stock ?? 0
        if (cartQuantity >= stock) {
            toast.error(`Only ${stock} in stock`)
            return
        }

        setIsUpdatingCart(true)
        try {
            const { error } = await updateCartQuantityAction(cartItemId, cartQuantity + 1)
            if (error) throw new Error(error)
            await syncCart()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to update quantity")
        } finally {
            setIsUpdatingCart(false)
        }
    }

    const handleDecrement = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        
        if (!cartItemId || isUpdatingCart) return

        setIsUpdatingCart(true)
        try {
            if (cartQuantity <= 1) {
                // Remove from cart
                const { error } = await removeFromCartAction(cartItemId)
                if (error) throw new Error(error)
                toast.success("Removed from cart")
            } else {
                const { error } = await updateCartQuantityAction(cartItemId, cartQuantity - 1)
                if (error) throw new Error(error)
            }
            await syncCart()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to update quantity")
        } finally {
            setIsUpdatingCart(false)
        }
    }

    const isInCart = cartQuantity > 0

    return (
        <Card className="group overflow-hidden bg-[#E5E9F0] border-none neu-raised transition-all duration-300 hover:scale-[1.02] rounded-[2rem] h-full flex flex-col">
            <Link href={`/product/${product.slug}`} prefetch={false} className="block relative aspect-square overflow-hidden p-2">
                <div className="relative w-full h-full overflow-hidden rounded-[1.5rem]">
                    <Image
                        src={withImageWidth(product.image)}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                        loading={priority ? "eager" : "lazy"}
                        priority={priority}
                        unoptimized
                    />
                    <div className="absolute top-2 right-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`rounded-full bg-white/60 hover:bg-white/10 transition-colors h-8 w-8 ${isWishlisted ? 'text-red-500' : 'text-tm-text-muted'}`}
                            onClick={handleWishlist}
                            disabled={isTogglingWishlist}
                        >
                            {isTogglingWishlist ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} />
                            )}
                        </Button>
                    </div>
                </div>
            </Link>
            <CardContent className="pt-2 flex-grow">
                {product.material && <div className="text-[10px] text-tm-text-muted mb-1 uppercase tracking-wider font-bold">{product.material}</div>}
                <h3 className="font-bold text-tm-text mb-2 line-clamp-1 group-hover:text-tm-red transition-colors font-serif">
                    <Link href={`/product/${product.slug}`} prefetch={false}>{product.name}</Link>
                </h3>
                <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-lg text-tm-text">{formatPrice(product.price)}</span>
                    {hasCalculator && (
                        <span className="text-xs text-tm-text-muted font-medium">per m²</span>
                    )}
                </div>
                
                {/* Stock Badge */}
                <div className="flex items-center gap-1">
                    {product.stock === 0 || product.stock === null ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                            ❌ Out of Stock
                        </span>
                    ) : product.stock <= 10 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                            ⚠️ Only {product.stock} left
                        </span>
                    ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                            ✅ In Stock
                        </span>
                    )}
                </div>
            </CardContent>
            <CardFooter className="pb-6 px-4">
                {isInCart ? (
                    /* ====== QUANTITY STEPPER (Amazon/Flipkart style) ====== */
                    <div className="w-full flex items-center justify-between rounded-full bg-primary/10 border-2 border-primary/20 h-10 px-1">
                        {/* Minus / Trash */}
                        <button
                            className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/80 transition-all active:scale-90 disabled:opacity-50"
                            onClick={handleDecrement}
                            disabled={isUpdatingCart}
                            title={cartQuantity === 1 ? "Remove from cart" : "Decrease quantity"}
                        >
                            {isUpdatingCart ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : cartQuantity === 1 ? (
                                <Trash2 className="h-3.5 w-3.5" />
                            ) : (
                                <Minus className="h-3.5 w-3.5" />
                            )}
                        </button>

                        {/* Count */}
                        <span className="font-bold text-primary text-sm tabular-nums select-none min-w-[2rem] text-center">
                            {cartQuantity}
                        </span>

                        {/* Plus */}
                        <button
                            className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/80 transition-all active:scale-90 disabled:opacity-50"
                            onClick={handleIncrement}
                            disabled={isUpdatingCart || cartQuantity >= (product.stock ?? 0)}
                            title="Increase quantity"
                        >
                            <Plus className="h-3.5 w-3.5" />
                        </button>
                    </div>
                ) : (
                    /* ====== ADD TO CART / VIEW PRODUCT BUTTON ====== */
                    <Button
                        className="w-full bg-tm-red hover:bg-tm-red/90 text-white rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 h-10 font-bold disabled:bg-gray-400 disabled:hover:bg-gray-400 disabled:hover:scale-100 disabled:cursor-not-allowed"
                        onClick={handleAddToCart}
                        disabled={isAddingToCart || product.stock === 0}
                    >
                        {product.stock === 0 ? (
                            <>❌ Out of Stock</>
                        ) : isAddingToCart ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Adding...
                            </>
                        ) : hasCalculator ? (
                            <>
                                <Calculator className="h-4 w-4 mr-2" />
                                Calculate & Add
                            </>
                        ) : (
                            <>
                                <ShoppingCart className="h-4 w-4 mr-2" />
                                Add to Cart
                            </>
                        )}
                    </Button>
                )}
            </CardFooter>
        </Card>
    )
})
