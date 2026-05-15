"use server"

import { createServerSupabase } from "@/lib/supabase/server"
import type { Database, Product } from "@/lib/supabase-types"

interface OrderItem {
    product_id: string
    quantity: number
    product_name: string
}

type OrderItemsRow = Pick<Database["public"]["Tables"]["orders"]["Row"], "items">

function isOrderItem(value: unknown): value is OrderItem {
    if (!value || typeof value !== "object") return false
    const item = value as Partial<OrderItem>
    return typeof item.product_id === "string" && typeof item.quantity === "number"
}

/**
 * Fetches popular products based on order frequency.
 * Counts how many times each product appears across all orders,
 * then returns the top N products sorted by purchase frequency.
 * Falls back to newest active products if no order data exists.
 */
export async function getPopularProductsAction(options?: {
    limit?: number
    excludeProductIds?: string[]
    categoryId?: string
}): Promise<{ data: Product[]; error: string | null }> {
    const limit = options?.limit || 8
    const excludeIds = options?.excludeProductIds || []
    const categoryId = options?.categoryId || null

    try {
        const supabase = await createServerSupabase()

        // Step 1: Fetch all orders and extract product frequency from items JSON
        const { data: orders, error: ordersError } = await supabase
            .from("orders")
            .select("items")

        if (ordersError) {
            console.error("[getPopularProductsAction] Orders fetch error:", ordersError)
        }

        // Build frequency map: product_id -> total quantity ordered
        const frequencyMap = new Map<string, number>()

        if (orders && orders.length > 0) {
            for (const order of orders as OrderItemsRow[]) {
                // items is stored as JSON string or array
                let items: OrderItem[] = []
                if (typeof order.items === "string") {
                    try {
                        const parsed = JSON.parse(order.items)
                        items = Array.isArray(parsed) ? parsed.filter(isOrderItem) : []
                    } catch {
                        continue
                    }
                } else if (Array.isArray(order.items)) {
                    items = (order.items as unknown[]).filter(isOrderItem)
                }

                for (const item of items) {
                    if (item.product_id) {
                        const current = frequencyMap.get(item.product_id) || 0
                        frequencyMap.set(item.product_id, current + (item.quantity || 1))
                    }
                }
            }
        }

        // Step 2: Fetch active products
        let query = supabase
            .from("products")
            .select(`
                *,
                categories (
                    id,
                    name,
                    slug,
                    parent_id
                )
            `)
            .eq("status", "active")

        if (categoryId) {
            query = query.eq("category_id", categoryId)
        }

        const { data: products, error: productsError } = await query

        if (productsError) {
            console.error("[getPopularProductsAction] Products fetch error:", productsError)
            return { data: [], error: productsError.message }
        }

        if (!products || products.length === 0) {
            return { data: [], error: null }
        }

        // Step 3: Filter out excluded product IDs
        let filtered = (products as Product[]).filter(
            (p) => !excludeIds.includes(p.id)
        )

        // Step 4: Sort by purchase frequency (descending), fallback to newest
        if (frequencyMap.size > 0) {
            filtered.sort((a, b) => {
                const freqA = frequencyMap.get(a.id) || 0
                const freqB = frequencyMap.get(b.id) || 0
                if (freqB !== freqA) return freqB - freqA
                // Tiebreaker: newest first
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            })
        }
        // If no orders exist, products keep their default order (newest first from query)

        return { data: filtered.slice(0, limit), error: null }
    } catch (err: any) {
        if (err?.digest === 'DYNAMIC_SERVER_USAGE' || err?.message?.includes('Dynamic server usage')) {
            throw err;
        }
        console.error("[getPopularProductsAction] Exception:", err)
        return { data: [], error: "Failed to fetch popular products" }
    }
}
