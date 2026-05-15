import {
  getServerSession,
  getNavData,
  getNavProducts,
  getCartData,
  getWishlistData,
  type CategoryWithChildren,
} from "@/lib/loaders"
import { SiteHeader } from "./site-header"

/**
 * Server Component wrapper for SiteHeader.
 * Fetches all header-required data on the server and passes props to client SiteHeader.
 * Uses getNavProducts() (lightweight) instead of getProducts() (full catalog).
 */
interface HeaderServerWrapperProps {
  categories?: CategoryWithChildren[]
}

export async function HeaderServerWrapper({ categories: preloadedCategories }: HeaderServerWrapperProps = {}) {
  const [session, { products: navProducts }] = await Promise.all([
    getServerSession(),
    getNavProducts()
  ])

  const categories = preloadedCategories ?? (await getNavData()).categories

  // Cart and wishlist depend on session, so fetch after
  const [{ cartCount }, { wishlistCount }] = await Promise.all([
    getCartData(session.userId),
    getWishlistData(session.userId)
  ])

  return (
    <SiteHeader
      session={session}
      categories={categories}
      products={navProducts}
      initialCartCount={cartCount}
      initialWishlistCount={wishlistCount}
    />
  )
}
