"use client"

import { useEffect, useState } from "react"
import { getPopularProductsAction } from "@/app/actions/popular"
import { ProductCard } from "@/components/products/product-card"
import type { Product } from "@/lib/supabase-types"

interface PopularProductsProps {
    title?: string
    limit?: number
    excludeProductIds?: string[]
    categoryId?: string
}

export function PopularProducts({
    title = "Most Popular Products",
    limit = 6,
    excludeProductIds = [],
    categoryId,
}: PopularProductsProps) {
    const [products, setProducts] = useState<Product[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        let cancelled = false

        async function fetchPopular() {
            setIsLoading(true)
            try {
                const { data } = await getPopularProductsAction({
                    limit,
                    excludeProductIds,
                    categoryId,
                })
                if (!cancelled) {
                    setProducts(data)
                }
            } catch (err) {
                console.error("[PopularProducts] Error:", err)
            } finally {
                if (!cancelled) setIsLoading(false)
            }
        }

        fetchPopular()
        return () => {
            cancelled = true
        }
    // Only re-fetch when excludeProductIds list changes (stringify for stable comparison)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [limit, categoryId, JSON.stringify(excludeProductIds)])

    if (!isLoading && products.length === 0) return null

    return (
        <section className="mt-12">
            <h2 className="text-2xl font-serif font-bold text-slate-800 mb-6">{title}</h2>

            {isLoading ? (
                /* Skeleton loader */
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                    {Array.from({ length: Math.min(limit, 4) }).map((_, i) => (
                        <div
                            key={i}
                            className="neu-raised rounded-[2rem] bg-[#E5E9F0] overflow-hidden animate-pulse"
                        >
                            <div className="aspect-square bg-slate-200" />
                            <div className="p-4 space-y-3">
                                <div className="h-3 bg-slate-200 rounded w-2/3" />
                                <div className="h-4 bg-slate-200 rounded w-1/3" />
                                <div className="h-10 bg-slate-200 rounded-full" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                    {products.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            )}
        </section>
    )
}
