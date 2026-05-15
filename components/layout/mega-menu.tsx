"use client"

import Link from "next/link"
import Image from "next/image"
import { memo, useMemo } from "react"
import { formatPrice } from "@/lib/utils"
import type { CategoryWithChildren } from "@/lib/loaders"
import type { Product } from "@/lib/supabase-types"

interface MegaMenuProps {
    category: CategoryWithChildren
    products: Product[]
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

export const MegaMenu = memo(function MegaMenu({ category, products }: MegaMenuProps) {
    const subcategories = useMemo(() => category.children || [], [category.children])
    const categoryIds = useMemo(() => [category.id, ...subcategories.map(s => s.id)], [category.id, subcategories])
    const featuredProducts = useMemo(() => {
        return products
            .filter(p =>
                categoryIds.includes(p.category_id || '') &&
                p.status === 'active' &&
                p.is_clearance !== true
            )
            .slice(0, 6)
    }, [categoryIds, products])
    const trendingProducts = useMemo(() => featuredProducts.slice(0, 3), [featuredProducts])

    return (
        <div className="w-full bg-[#E5E9F0] border-t border-gray-200 py-8" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
            <div className="container mx-auto max-w-[1400px] px-4">
                <div className="grid grid-cols-12 gap-8">
                    {/* Left Sidebar: Categories List & Featured Products */}
                    <div className="col-span-3 flex flex-col gap-8 border-r border-gray-100 pr-8">
                        {/* Categories List */}
                        <div>
                            <h4 className="font-bold mb-4 text-sm uppercase tracking-wider text-primary">
                                {category.name} Categories
                            </h4>
                            <ul className="space-y-2.5">
                                {subcategories.map((sub) => (
                                    <li key={sub.id}>
                                        <Link
                                            href={`/${sub.slug}`}
                                            className="block text-gray-600 hover:text-primary transition-colors text-[13px] font-medium uppercase tracking-wide group flex items-center justify-between"
                                        >
                                            {sub.name}
                                            <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                                        </Link>
                                    </li>
                                ))}
                                <li className="pt-2">
                                    <Link
                                        href={`/${category.slug}`}
                                        className="text-primary font-bold text-[13px] uppercase tracking-wide hover:underline"
                                    >
                                        View All {category.name}
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        {/* Featured Products (Vertical) */}
                        {featuredProducts.length > 0 && (
                            <div>
                                <h4 className="font-bold mb-4 text-sm uppercase tracking-wider text-primary">
                                    Trending Now
                                </h4>
                                <div className="space-y-4">
                                    {trendingProducts.map((product) => (
                                        <Link
                                            key={product.id}
                                            href={`/product/${product.slug}`}
                                            className="flex gap-4 group"
                                        >
                                            <div className="relative w-16 h-16 flex-shrink-0 rounded border border-gray-100 overflow-hidden bg-gray-50">
                                                {product.image ? (
                                                    <Image
                                                        src={withImageWidth(product.image)}
                                                        alt={product.name}
                                                        fill
                                                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                                                        sizes="64px"
                                                        loading="lazy"
                                                        unoptimized
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                        <span className="text-xs">No Img</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <h5 className="text-[13px] font-medium text-gray-800 line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                                                    {product.name}
                                                </h5>
                                                <p className="text-sm text-primary font-bold mt-1">
                                                    {formatPrice(product.price)}
                                                </p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Content: Visual Categories Grid */}
                    <div className="col-span-9">
                        <div className="grid grid-cols-4 gap-5">
                            {subcategories.map((sub) => (
                                <Link
                                    key={sub.id}
                                    href={`/${sub.slug}`}
                                    className="group relative block rounded-lg overflow-hidden bg-[#D8DEE9] border border-gray-300/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                                >
                                    <div className="aspect-[4/3] w-full relative">
                                        {sub.image ? (
                                            <Image
                                                src={withImageWidth(sub.image)}
                                                alt={sub.name}
                                                fill
                                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                loading="lazy"
                                                unoptimized
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                                                <span className="text-xs uppercase">No Image</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="p-3 text-center">
                                        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide group-hover:text-primary transition-colors">
                                            {sub.name}
                                        </h3>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
})
