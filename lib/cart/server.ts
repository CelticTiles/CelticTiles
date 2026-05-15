import { createServerSupabase } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase-types'

export interface CartItem {
    id: string
    product_id: string
    variant_id: string | null
    product_name: string
    product_price: number
    product_image: string | null
    product_slug: string
    quantity: number
}

type CartItemRow = Pick<
  Database["public"]["Tables"]["cart_items"]["Row"],
  "id" | "product_id" | "variant_id" | "product_name" | "product_price" | "product_image" | "quantity"
>
type ProductSlugRow = Pick<Database["public"]["Tables"]["products"]["Row"], "id" | "slug">

/**
 * Get cart items for a user - server-side function.
 * Uses the server Supabase client for cookie-based auth.
 */
export async function getCartForUser(): Promise<{ cart: CartItem[]; isLoggedIn: boolean }> {
    try {
        const supabase = await createServerSupabase()
        
        // Get current user
        const response = await supabase.auth.getUser()
        const user = response?.data?.user
        const authError = response?.error
        
        if (authError || !user) {
            return { cart: [], isLoggedIn: false }
        }

        // Fetch cart items for user
        const { data, error } = await supabase
            .from('cart_items')
            .select('id, product_id, variant_id, product_name, product_price, product_image, quantity')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching cart:', error)
            return { cart: [], isLoggedIn: true }
        }

        // Batch-lookup slugs from products table
        const cartRows = (data || []) as CartItemRow[]
        const productIds = [...new Set(cartRows.map((item) => item.product_id))]
        let slugMap: Record<string, string> = {}
        if (productIds.length > 0) {
            const { data: products } = await supabase
                .from('products')
                .select('id, slug')
                .in('id', productIds)
            if (products) {
                slugMap = Object.fromEntries(
                    (products as ProductSlugRow[]).map((p) => [p.id, p.slug])
                )
            }
        }

        const cart: CartItem[] = cartRows.map((item) => ({
            id: item.id,
            product_id: item.product_id,
            variant_id: item.variant_id,
            product_name: item.product_name,
            product_price: item.product_price,
            product_image: item.product_image,
            product_slug: slugMap[item.product_id] || item.product_id,
            quantity: item.quantity,
        }))

        return { 
            cart, 
            isLoggedIn: true 
        }
    } catch (error: any) {
        if (error?.digest === 'DYNAMIC_SERVER_USAGE' || error?.message?.includes('Dynamic server usage')) {
            throw error;
        }
        console.error('Error in getCartForUser:', error)
        return { cart: [], isLoggedIn: false }
    }
}
