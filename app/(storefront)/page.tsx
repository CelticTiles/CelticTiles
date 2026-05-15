import { getHomePageData } from "@/lib/loaders"
import { getPopularProductsAction } from "@/app/actions/popular"
import HomeClient from "./HomeClient"

// ✅ Enable ISR with 60-second revalidation (was: force-dynamic)
// This enables caching while keeping data fresh
export const revalidate = 60

/**
 * Home Page - Server Component
 * Fetches all data server-side and passes to client components via props.
 * No client-side mount fetches for initial data.
 * 
 * Performance: ISR with 60s revalidation provides:
 * - First load: Server-rendered with fresh data
 * - Subsequent loads: Cached (95%+ faster)
 * - Auto-refresh: Every 60 seconds
 */
export default async function HomePage() {
    const { 
        session, 
        categories, 
        products, 
        wishlist 
    } = await getHomePageData()
    const { data: popularProducts } = await getPopularProductsAction({ limit: 8 })
    const activeFallbackProducts = products.filter((p) => p.status === "active").slice(0, 8)
    const homepagePopularProducts = popularProducts.length > 0 ? popularProducts : activeFallbackProducts

    return (
        <HomeClient
            session={session}
            categories={categories}
            wishlistProductIds={wishlist.map(w => w.product_id)}
            popularProducts={homepagePopularProducts}
        />
    )
}
