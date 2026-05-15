"use client"

import { ProductCard } from "@/components/products/product-card"
import { Search } from "lucide-react"
import Link from "next/link"
import type { Product } from "@/lib/supabase-types"

interface SearchProduct {
  id: string
  name: string
  slug: string
  price: number | null
  image: string | null
  description: string | null
  stock: number
  status: string
  category_id: string | null
}

interface SearchPageClientProps {
  query: string
  initialResults: SearchProduct[]
}

export default function SearchPageClient({ query, initialResults }: SearchPageClientProps) {
  const productsForCards: Product[] = initialResults.map(p => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    image: p.image,
    description: p.description,
    stock: p.stock,
    status: p.status,
    category_id: p.category_id,
    subtitle: null,
    is_clearance: false,
    low_stock_threshold: 5,
    assigned_code: null,
    material: null,
    size: null,
    finish: null,
    thickness: null,
    sqm_per_box: null,
    application_area: null,
    package_included: null,
    has_led: false,
    brand: null,
    availability: null,
    panel_length: null,
    panel_width: null,
    created_at: '',
    updated_at: ''
  }))

  return (
    <main className="min-h-screen bg-[#E5E9F0]">
      <div className="container mx-auto max-w-[1400px] px-6 py-12">
        {/* Search Header */}
        <div className="mb-12 text-center">
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-slate-800 mb-4">
            Search <span className="text-primary italic">Results</span>
          </h1>
          <div className="h-1.5 w-24 bg-primary/20 rounded-full mx-auto mb-4" />
          {query && (
            <p className="text-lg text-slate-500">
              {initialResults.length} result{initialResults.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
            </p>
          )}
        </div>

        {!query.trim() ? (
          <div className="neu-inset rounded-[2rem] p-12 text-center">
            <Search className="h-16 w-16 mx-auto text-slate-400/50 mb-4" />
            <h2 className="text-xl font-medium text-slate-600 mb-2">Enter a search term</h2>
            <p className="text-sm text-slate-500">Use the search bar above to find products</p>
          </div>
        ) : initialResults.length === 0 ? (
          <div className="neu-inset rounded-[2rem] p-12 text-center">
            <Search className="h-16 w-16 mx-auto text-slate-400/50 mb-4" />
            <h2 className="text-xl font-medium text-slate-600 mb-2">No products found</h2>
            <p className="text-sm text-slate-500 mb-6">
              We couldn&apos;t find any products matching &ldquo;{query}&rdquo;
            </p>
            <Link
              href="/"
              className="inline-block px-8 py-3 bg-primary text-white font-bold rounded-full hover:bg-primary/90 transition-colors shadow-lg"
            >
              Browse All Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {productsForCards.map((product, i) => (
              <ProductCard key={product.id} product={product} priority={i < 4} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
