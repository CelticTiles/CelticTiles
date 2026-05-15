import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabase } from '@/lib/supabase/server'
import type { Database } from "@/supabase/database.types"
import type { Category, Product } from "@/lib/supabase-types"


/**
 * Server-side data loaders - single source of truth
 * These functions run ONLY on the server and pass data via props to client components.
 */

export interface ServerSession {
  userId: string | null
  userName: string | null
  userEmail: string | null
  userRole: 'customer' | 'sales' | 'admin' | 'inventory'
}

export interface CartItemData {
  id: string
  product_id: string
  variant_id: string | null
  product_name: string
  product_price: number
  product_image: string | null
  quantity: number
}

export interface WishlistItemData {
  id: string
  product_id: string
}

export interface SiteSettingsData {
  tax_rate: number
  free_shipping_threshold: number
  shipping_fee: number
}

// Public server client for non-user-specific read-only data.
const publicSupabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
)

const getCachedCategories = unstable_cache(
  async () => {
    const { data, error } = await publicSupabase
      .from('categories')
      .select('id, name, slug, parent_id, image, description, created_at')
      .order('name', { ascending: true })

    if (error) {
      throw error
    }

    return (data || []) as Category[]
  },
  ['nav-categories-v1'],
  { revalidate: 300 }
)

const getCachedNavProductsData = unstable_cache(
  async () => {
    const { data, error } = await publicSupabase
      .from('products')
      .select('id, name, slug, price, image, category_id, status, is_clearance')
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return (data || []) as Product[]
  },
  ['nav-products-v1'],
  { revalidate: 120 }
)

const getCachedSiteSettingsData = unstable_cache(
  async () => {
    const { data, error } = await publicSupabase
      .from('site_settings')
      .select('tax_rate, free_shipping_threshold')
      .eq('id', 1)
      .maybeSingle()

    if (error) {
      throw error
    }

    const dbThreshold = Number(data?.free_shipping_threshold ?? 1000)
    return {
      tax_rate: Number(data?.tax_rate ?? 0),
      free_shipping_threshold: Math.max(dbThreshold, 1000),
      shipping_fee: 10,
    } as SiteSettingsData
  },
  ['site-settings-v1'],
  { revalidate: 300 }
)

/**
 * Get current user session from Supabase auth
 */
export async function getServerSession(): Promise<ServerSession> {
  try {
    const supabase = await createServerSupabase()
    const response = await supabase.auth.getUser()
    const user = response?.data?.user
    const error = response?.error

    if (error || !user) {
      return { userId: null, userName: null, userEmail: null, userRole: 'customer' }
    }

    // Fetch profile with role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role_id, roles(name)')
      .eq('id', user.id)
      .single()

    const profileData = profile as Record<string, unknown> | null
    const rolesData = profileData?.roles as { name?: string } | undefined
    const roleName = (rolesData?.name || 'customer') as 'customer' | 'sales' | 'admin'

    return {
      userId: user.id,
      userName: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
      userEmail: user.email || null,
      userRole: roleName
    }
  } catch {
    return { userId: null, userName: null, userEmail: null, userRole: 'customer' }
  }
}

/**
 * Category with children for hierarchical navigation
 */
export interface CategoryWithChildren extends Category {
  children: CategoryWithChildren[]
}

/**
 * Get navigation data (categories) as a TREE structure.
 * Root categories have `children` arrays containing subcategories.
 */
export const getNavData = cache(async function getNavData(): Promise<{ categories: CategoryWithChildren[] }> {
  try {
    const typedData = await getCachedCategories()
    if (typedData.length === 0) {
      return { categories: [] }
    }

    const map = new Map<string, CategoryWithChildren>()
    const roots: CategoryWithChildren[] = []

    // create nodes
    for (const cat of typedData) {
      map.set(cat.id, {
        ...cat,
        children: []
      })
    }

    // link parents
    for (const cat of typedData) {
      const node = map.get(cat.id)!
      if (cat.parent_id && map.has(cat.parent_id)) {
        map.get(cat.parent_id)!.children.push(node)
      } else {
        roots.push(node)
      }
    }

    // Custom sort order
    const ORDER = [
      "clearance",
      "tiles",
      "laminates",
      "wall panels",
      "mirrors",
      "vanity units",
      "accessories"
    ]

    roots.sort((a, b) => {
      const nameA = a.name.toLowerCase().trim()
      const nameB = b.name.toLowerCase().trim()
      
      const indexA = ORDER.indexOf(nameA)
      const indexB = ORDER.indexOf(nameB)
      
      // If both are found in the list, sort by index
      if (indexA !== -1 && indexB !== -1) return indexA - indexB
      
      // If only A is found, it comes first
      if (indexA !== -1) return -1
      
      // If only B is found, it comes first
      if (indexB !== -1) return 1
      
      // If neither is found, sort alphabetically
      return nameA.localeCompare(nameB)
    })

    return { categories: roots }
  } catch (err) {
    console.error('getNavData fatal:', err)
    return { categories: [] }
  }
})

/**
 * Get products for display
 * @param limit - Optional limit on number of products to fetch (default: all)
 */
export async function getProducts(limit?: number): Promise<{ products: Product[] }> {
  try {
    const supabase = await createServerSupabase()

    let query = supabase
      .from('products')
      .select(`
        *,
        categories (
          id,
          name,
          slug,
          parent_id
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    // Apply limit if specified
    if (limit) {
      query = query.limit(limit)
    }

    const { data, error } = await query

    if (error) throw error

    return { products: (data || []) as Product[] }
  } catch {
    return { products: [] }
  }
}

/**
 * Get lightweight product data for navigation mega menu only.
 * Fetches minimal columns instead of select(*) — used by HeaderServerWrapper.
 * DO NOT use this for product listing pages.
 */
export async function getNavProducts(): Promise<{ products: Product[] }> {
  try {
    const products = await getCachedNavProductsData()
    return { products }
  } catch {
    return { products: [] }
  }
}

export async function getSiteSettings(): Promise<SiteSettingsData> {
  try {
    return await getCachedSiteSettingsData()
  } catch {
    return { tax_rate: 0, free_shipping_threshold: 1000, shipping_fee: 10 }
  }
}

/**
 * Get cart items for user
 */
export async function getCartData(userId: string | null): Promise<{ cart: CartItemData[]; cartCount: number }> {
  if (!userId) {
    return { cart: [], cartCount: 0 }
  }

  try {
    const supabase = await createServerSupabase()
    const { data, error } = await supabase
      .from('cart_items')
      .select('id, product_id, variant_id, product_name, product_price, product_image, quantity')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    
    const cart = (data || []) as CartItemData[]
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
    
    return { cart, cartCount }
  } catch {
    return { cart: [], cartCount: 0 }
  }
}

/**
 * Get wishlist items for user
 */
export async function getWishlistData(userId: string | null): Promise<{ wishlist: WishlistItemData[]; wishlistCount: number }> {
  if (!userId) {
    return { wishlist: [], wishlistCount: 0 }
  }

  try {
    const supabase = await createServerSupabase()
    const { data, error } = await supabase
      .from('wishlist_items')
      .select('id, product_id')
      .eq('user_id', userId)

    if (error) throw error
    
    const wishlist = (data || []) as WishlistItemData[]
    
    return { wishlist, wishlistCount: wishlist.length }
  } catch {
    return { wishlist: [], wishlistCount: 0 }
  }
}

/**
 * Combined loader for home page - fetches all required data in parallel
 * Optimized to fetch only necessary data for initial page load
 */
export async function getHomePageData() {
  // Session first (fast ~50ms auth check), then everything else in ONE parallel batch
  const session = await getServerSession()

  const [{ categories }, { products }, { cart, cartCount }, { wishlist, wishlistCount }] = await Promise.all([
    getNavData(),
    getProducts(12),  // ✅ Fetch only 12 products for homepage
    getCartData(session.userId),
    getWishlistData(session.userId)
  ])

  return {
    session,
    categories,
    products,
    cart,
    cartCount,
    wishlist,
    wishlistCount
  }
}

