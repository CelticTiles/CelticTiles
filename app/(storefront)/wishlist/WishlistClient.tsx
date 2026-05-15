"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { X, ShoppingCart, Loader2 } from "lucide-react"
import { formatPrice } from "@/lib/utils"
import Link from "next/link"
import Image from "next/image"
import { useState, useEffect } from "react"
import { useCart } from "@/hooks/useCart"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import useStore from "@/hooks/useStore"
import { PopularProducts } from "@/components/products/PopularProducts"

export interface WishlistProduct {
    id: string
    name: string
    slug: string
    subtitle: string | null
    price: number
    image: string | null
}

interface WishlistClientProps {
    initialProducts: WishlistProduct[]
    userId: string
}

export default function WishlistClient({ initialProducts, userId }: WishlistClientProps) {
    const supabase = getSupabaseBrowserClient()
    const { addToCart } = useCart()
    const setWishlist = useStore((state) => state.setWishlist)
    const [products, setProducts] = useState<WishlistProduct[]>(initialProducts)
    const [addingItemId, setAddingItemId] = useState<string | null>(null)
    const [removingItemId, setRemovingItemId] = useState<string | null>(null)

    // Sync initial wishlist from server to global store
    useEffect(() => {
        setWishlist(initialProducts.map(p => p.id))
    }, [initialProducts, setWishlist])

    const handleRemove = async (productId: string) => {
        setRemovingItemId(productId)
        try {
            const { error } = await supabase
                .from('wishlist_items')
                .delete()
                .eq('user_id', userId)
                .eq('product_id', productId)

            if (error) throw error
            
            // Remove from local state
            const updatedProducts = products.filter(p => p.id !== productId)
            setProducts(updatedProducts)
            
            // Sync to global store
            setWishlist(updatedProducts.map(p => p.id))
            
            toast.success("Removed from wishlist")
        } catch (err) {
            toast.error("Failed to remove item")
            console.error(err)
        } finally {
            setRemovingItemId(null)
        }
    }

    const handleAddToCart = async (item: WishlistProduct) => {
        setAddingItemId(item.id)
        try {

            await addToCart({
                product_id: item.id,
                product_name: item.name,
                product_price: item.price || 0,
                product_image: item.image,
                quantity: 1
            })
            
            // Remove from wishlist after adding to cart (Move logic)
            await handleRemove(item.id)
            
            toast.success("Moved to cart!")
        } catch (err: any) {
            console.error('[Wishlist] Detailed move failure:', err);
            const errorMessage = err?.message || "Failed to move to cart";
            toast.error(errorMessage)
        } finally {
            setAddingItemId(null)
        }
    }

    if (products.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mb-6">
                    <ShoppingCart className="h-10 w-10 text-primary/50" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">Your wishlist is empty</h2>
                <p className="text-muted-foreground mb-8 max-w-sm">
                    Save items you love here to check them out later.
                </p>
                <Button className="bg-primary text-white hover:bg-primary/90" size="lg" asChild>
                    <Link href="/tiles">Browse Products</Link>
                </Button>
            </div>
        )
    }

    return (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((item) => (
                <Card key={item.id} className="group relative overflow-hidden border-border hover:shadow-lg transition-shadow">
                    <button
                        className="absolute top-3 right-3 z-10 bg-white/90 backdrop-blur rounded-full p-2 shadow-md hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
                        onClick={() => handleRemove(item.id)}
                        disabled={removingItemId === item.id}
                        title="Remove from wishlist"
                    >
                        {removingItemId === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <X className="h-4 w-4" />
                        )}
                    </button>

                    <Link href={`/product/${item.slug}`}>
                        <div className="aspect-square relative bg-neutral-light overflow-hidden">
                            <Image
                                src={item.image || '/images/placeholder.jpg'}
                                alt={item.name}
                                fill
                                className="object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                        </div>
                    </Link>

                    <CardContent className="p-4">
                        <Link href={`/product/${item.slug}`} className="block mb-3">
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-1 min-h-[3rem]">
                                {item.name}
                            </h3>
                            {/* {item.subtitle && (
                                <p className="text-sm text-muted-foreground mb-2">{item.subtitle}</p>
                            )} */}
                            <p className="text-lg font-bold text-primary">{formatPrice(item.price)}</p>
                        </Link>

                        <Button
                            className="w-full gap-2 bg-primary hover:bg-primary-dark text-white"
                            disabled={addingItemId === item.id}
                            onClick={() => handleAddToCart(item)}
                        >
                            {addingItemId === item.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <ShoppingCart className="h-4 w-4" />
                            )}
                            Add to Cart
                        </Button>
                    </CardContent>
                </Card>
            ))}
        </div>

        {/* Popular Products Suggestions */}
        <PopularProducts
            title="Popular Products"
            limit={4}
            excludeProductIds={products.map(p => p.id)}
        />
    </>
    )
}
