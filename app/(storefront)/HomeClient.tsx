"use client"


import { HeroBanner } from "@/components/home/hero-banner"
import { ProductCard } from "@/components/products/product-card"
import { Button } from "@/components/ui/button"
import { lazy, Suspense, useEffect, useRef, useMemo } from "react"
import { MapPin } from "lucide-react"
import { useStore } from "@/hooks/useStore"
import type { Product } from "@/lib/supabase-types"
import type { ServerSession, CategoryWithChildren } from "@/lib/loaders"
import { toast } from "sonner"

// Lazy load heavy components
const CategoryShowcaseGrid = lazy(() => import("@/components/home/category-showcase-grid").then(m => ({ default: m.CategoryShowcaseGrid })))
const CircleCategoryCarousel = lazy(() => import("@/components/home/circle-category-carousel").then(m => ({ default: m.CircleCategoryCarousel })))
const ReviewCarousel = lazy(() => import("@/components/home/review-carousel").then(m => ({ default: m.ReviewCarousel })))
const NewsletterSignup = lazy(() => import("@/components/home/newsletter-signup").then(m => ({ default: m.NewsletterSignup })))

// Maps known subcategory slugs to public folder images
const CATEGORY_IMAGES: Record<string, string> = {
    'large-tiles':            '/images/categories/large-tiles.png',
    'marble-tiles':           '/images/categories/marble-tiles.png',
    'marble-effect-tiles':    '/images/categories/marble-tiles.png',
    'wood-tiles':             '/images/categories/wood-tiles.png',
    'wood-effect-tiles':      '/images/categories/wood-tiles.png',
    'metro-tiles':            '/images/categories/metro-tiles.png',
    'pattern-tiles':          '/images/categories/pattern-tiles.png',
    'hexagon-tiles':          '/images/categories/hexagon-tiles.png',
    'artificial-grass':       '/images/categories/artificial-grass.png',
    'decking':                '/images/categories/decking.png',
    'slat-panelling':         '/images/categories/slat-panelling.png',
    'slat-wall-panelling':    '/images/categories/slat-panelling.png',
    'wall-panels':            '/images/categories/slat-panelling.png',
    'vanity-units':           '/images/categories/vanity-unit.png',
    'vanity-unit':            '/images/categories/vanity-unit.png',
    'walk-in-shower':         '/images/categories/walk-in-shower.png',
    'modern-suite':           '/images/categories/modern-suite.png',
}

interface HomeClientProps {
    session: ServerSession
    popularProducts: Product[]
    categories: CategoryWithChildren[]
    wishlistProductIds: string[]
}

export default function HomeClient({
    session,
    popularProducts,
    categories,
    wishlistProductIds
}: HomeClientProps) {
    // Sync server data to Zustand store ONLY on first mount (hydration safe)
    const { login, setWishlist, _hasHydrated } = useStore()
    const hasSyncedRef = useRef(false)
    const prevWishlistRef = useRef<string[]>([])

    // Only subcategories of categories that have children
    const categoryItems = useMemo(() => {
        const items: { name: string; href: string; image: string }[] = []
        for (const cat of categories) {
            if (cat.children && cat.children.length > 0) {
                for (const child of cat.children) {
                    const normalizedName = child.name.toLowerCase().trim()
                    const normalizedSlug = child.slug.toLowerCase().trim()
                    const isToiletCategory =
                        normalizedName.includes('toilet') ||
                        normalizedSlug.includes('toilet')

                    if (isToiletCategory) {
                        continue
                    }

                    items.push({
                        name: child.name.toUpperCase(),
                        href: `/${child.slug}`,
                        image: child.image || CATEGORY_IMAGES[child.slug] || '/images/placeholder.jpg',
                    })
                }
            }
        }

        const hasVanityInItems = items.some((item) => item.href === '/vanity-units' || item.href === '/vanity-unit')
        if (!hasVanityInItems) {
            const vanityCategory = categories.find((cat) => {
                const normalizedName = cat.name.toLowerCase().trim()
                return normalizedName === 'vanity units' || normalizedName === 'vanity unit'
            })

            if (vanityCategory) {
                items.push({
                    name: vanityCategory.name.toUpperCase(),
                    href: `/${vanityCategory.slug}`,
                    image: CATEGORY_IMAGES[vanityCategory.slug] || vanityCategory.image || '/images/categories/vanity-unit.png',
                })
            }
        }

        return items
    }, [categories])

    // Quick Shop should include direct root categories that do not have subcategories.
    const quickShopItems = useMemo(() => {
        const items = [...categoryItems]
        const seen = new Set(items.map(item => item.href))
        const directCategoryNames = new Set(['wall panels', 'mirrors', 'vanity units'])

        for (const cat of categories) {
            const hasChildren = Boolean(cat.children && cat.children.length > 0)
            const isDirectCategory = directCategoryNames.has(cat.name.toLowerCase().trim())

            if (!hasChildren && isDirectCategory) {
                const href = `/${cat.slug}`
                if (!seen.has(href)) {
                    items.push({
                        name: cat.name.toUpperCase(),
                        href,
                        image: cat.image || CATEGORY_IMAGES[cat.slug] || '/images/placeholder.jpg',
                    })
                    seen.add(href)
                }
            }
        }

        return items
    }, [categories, categoryItems])
    
    useEffect(() => {
        // Only sync ONCE after Zustand hydrates, and only if data actually changed
        if (!_hasHydrated || hasSyncedRef.current) return
        
        // Deep equality check for wishlist
        const wishlistChanged = 
            wishlistProductIds.length !== prevWishlistRef.current.length ||
            wishlistProductIds.some((id, i) => id !== prevWishlistRef.current[i])
        
        // Sync auth state from server (only if we have a user)
        if (session.userId && session.userName && session.userEmail) {
            login(session.userId, session.userName, session.userEmail, session.userRole)
        }
        
        // Sync wishlist IDs only if different
        if (wishlistChanged) {
            setWishlist(wishlistProductIds)
            prevWishlistRef.current = wishlistProductIds
        }
        
        hasSyncedRef.current = true
    }, [_hasHydrated, session.userId, session.userName, session.userEmail, session.userRole, wishlistProductIds, login, setWishlist])

    useEffect(() => {
        if (typeof document === 'undefined') return

        if (document.cookie.includes('logged_out=true')) {
            toast.success('Logged out successfully')
            document.cookie = 'logged_out=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
        }
    }, [])
    
    return (
        <>
            <main>
                {/* Hero Section */}
                <HeroBanner
                    title="ELEVATE YOUR SPACE WITH EXQUISITE TILES"
                    subtitle="Discover unparalleled craftsmanship and design for every vision"
                    buttonText="SHOP NOW"
                    buttonHref="/products"
                />

                {/* Category Showcase */}
                <Suspense fallback={<div className="py-12 bg-white"><div className="container mx-auto max-w-[1400px] px-4"><div className="h-64 bg-tm-bg-muted animate-pulse rounded-lg" /></div></div>}>
                    <CategoryShowcaseGrid items={categoryItems} />
                </Suspense>

                {/* Circle Category Carousel */}
                <Suspense fallback={<div className="py-12 bg-white"><div className="container mx-auto max-w-[1400px] px-4"><div className="h-64 bg-tm-bg-muted animate-pulse rounded-lg" /></div></div>}>
                    <CircleCategoryCarousel
                        title="QUICK SHOP"
                        categories={quickShopItems}
                    />
                </Suspense>

                {/* Most Popular Products */}
                <section className="py-20 md:py-24 bg-[#E5E9F0]">
                    <div className="container mx-auto max-w-[1400px] px-6">
                        <div className="flex flex-col items-center justify-center mb-16 text-center">
                            <h2 className="font-serif text-4xl md:text-6xl font-bold text-slate-800 leading-tight">
                                Most <span className="text-primary italic">Popular</span>
                            </h2>
                            <div className="h-1.5 w-24 bg-primary/20 rounded-full mt-4" />
                        </div>
                        
                        {popularProducts.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-12">
                                {popularProducts.map((product) => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        ) : (
                            <div className="neu-inset rounded-[2rem] p-12 text-center">
                                <p className="text-slate-500 font-medium">No products available at the moment.</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* Reviews */}
                <Suspense fallback={<div className="py-16 bg-white"><div className="container mx-auto max-w-[1400px] px-4"><div className="h-64 bg-tm-bg-muted animate-pulse rounded-lg" /></div></div>}>
                    <ReviewCarousel />
                </Suspense>

                {/* Newsletter */}
                <Suspense fallback={<div className="py-16 bg-tm-bg-muted"><div className="container mx-auto max-w-[1400px] px-4"><div className="h-48 bg-white animate-pulse rounded-lg" /></div></div>}>
                    <NewsletterSignup />
                </Suspense>

                {/* Visit our Showrooms */}
                <section className="py-10 md:py-10 bg-[#E5E9F0]">
                    <div className="container mx-auto max-w-[1400px] px-6">
                        <div className="neu-raised rounded-[2.5rem] p-6 md:p-8 lg:p-10 bg-[#E5E9F0] overflow-hidden">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                                {/* Left Column - Content */}
                                <div className="flex flex-col justify-center space-y-6">
                                    <div>
                                        <h2 className="font-serif text-3xl md:text-4xl font-bold text-slate-800 leading-tight">
                                            Visit our <br />
                                            <span className="text-primary italic">Showroom</span>
                                        </h2>
                                        <p className="text-base text-slate-500 mt-4 leading-relaxed max-w-xl">
                                            Experience the texture and quality of our tiles in person. Our experts in Dublin are ready to help you design your dream space.
                                        </p>
                                    </div>

                                    {/* Showroom Locations - Neumorphic Cards */}
                                    <div className="space-y-4">
                                        <div className="neu-inset rounded-[1.5rem] p-5 flex items-start gap-4 group">
                                            <div className="h-10 w-10 rounded-xl neu-raised bg-[#E5E9F0] flex items-center justify-center text-primary group-hover:scale-100 transition-transform">
                                                <MapPin className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-serif text-lg font-bold text-slate-800 mb-1">Dublin Showroom</h3>
                                                <p className="text-slate-500 leading-relaxed text-sm font-medium">
                                                    Besides AXA insurance, Finches Industrial Park, Long Mile Rd, Walkinstown, Dublin, D12 FP74
                                                </p>
                                                <div className="flex items-center gap-2 mt-2 text-primary font-bold text-xs uppercase tracking-widest">
                                                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                                    Open Monday - Friday: 8am - 8pm
                                                </div>
                                                <div className="flex items-center gap-2 mt-2 text-primary font-bold text-xs uppercase tracking-widest">
                                                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                                    Open Saturday: 9am - 6pm
                                                </div>
                                                <div className="flex items-center gap-2 mt-2 text-primary font-bold text-xs uppercase tracking-widest">
                                                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                                    Open Sunday: 10am - 5pm
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <Button
                                        size="lg"
                                        className="w-fit h-12 px-8 bg-primary hover:bg-primary-dark text-white font-bold rounded-full shadow-lg flex items-center gap-3"
                                        onClick={() => window.open('https://www.google.com/maps/place/Celtic+Tiles/@53.3240536,-6.3380458,17z/data=!3m1!4b1!4m6!3m5!1s0x4867133caf418fc7:0x8584650c497326da!8m2!3d53.3240536!4d-6.3380458!16s%2Fg%2F11c5q8y8qy', '_blank')}
                                    >
                                        Get Directions
                                        <span>→</span>
                                    </Button>
                                </div>
                                
                                {/* Right Column - Google Map */}
                                <div className="relative group">
                                    <div className="neu-raised rounded-[2rem] p-2 bg-[#E5E9F0] h-[340px] lg:h-[420px]">
                                        <div className="relative w-full h-full rounded-[2rem] overflow-hidden shadow-inner border border-white/20">
                                            <iframe 
                                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2383.072588924593!2d-6.3380458!3d53.3240536!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4867133caf418fc7%3A0x8584650c497326da!2sCeltic%20Tiles!5e0!3m2!1sen!2sin!4v1769794286118!5m2!1sen!2sin" 
                                                width="100%" 
                                                height="100%" 
                                                style={{ border: 0 }}
                                                allowFullScreen
                                                loading="lazy"
                                                referrerPolicy="no-referrer-when-downgrade"
                                                className="w-full h-full filter grayscale-[0.2] contrast-[1.1]"
                                                title="Celtic Tiles Showroom Locations"
                                            />
                                        </div>
                                    </div>
                                    
                                    {/* Map Floating Badge */}
                                    <div className="absolute -bottom-3 -right-5 md:right-12 z-10 scale-90 md:scale-100">
                                        <div className="neu-raised bg-white p-6 rounded-[2rem] flex items-center gap-4 shadow-2xl">
                                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                ★
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 leading-none">4.8 / 5.0 Rating</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1">Based on 100+ Google Reviews</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </>
    )
}
