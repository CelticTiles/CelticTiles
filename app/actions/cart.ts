"use server"

import { createServerSupabase } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { Database } from "@/lib/supabase-types"

export type CartItem = Database["public"]["Tables"]["cart_items"]["Row"]
type CartItemInsert = Database["public"]["Tables"]["cart_items"]["Insert"]
type CartItemExisting = Pick<CartItem, "id" | "quantity">

export interface AddToCartInput {
  product_id: string
  variant_id?: string | null
  product_name: string
  product_price: number
  product_image?: string | null
  quantity?: number
}

const CART_ITEM_SELECT_FIELDS = 'id, user_id, product_id, variant_id, product_name, product_price, product_image, quantity, reserved_until, created_at, updated_at'

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

/**
 * Fetch all cart items for the current user
 */
export async function fetchCartAction(): Promise<{ data: CartItem[] | null; error: string | null }> {
  try {
    const supabase = await createServerSupabase()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { data: [], error: null }
    }

    // Fetch cart items
    const { data, error } = await supabase
      .from('cart_items')
      .select(CART_ITEM_SELECT_FIELDS)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[fetchCartAction] Error:', error)
      return { data: null, error: error.message }
    }

    return { data: data as CartItem[], error: null }
  } catch (error: unknown) {
    console.error('[fetchCartAction] Exception:', error)
    return { data: null, error: getErrorMessage(error, 'Failed to fetch cart') }
  }
}

/**
 * Add item to cart (or update quantity if already exists)
 */
export async function addToCartAction(input: AddToCartInput): Promise<{ data: CartItem | null; error: string | null }> {
  try {
    const supabase = await createServerSupabase()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { data: null, error: 'Must be logged in to add to cart' }
    }

    // Check if item already exists in cart
    const variantId = input.variant_id || null
    let existingQuery = supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('user_id', user.id)
      .eq('product_id', input.product_id)

    // CRITICAL: .eq('col', null) produces "col = null" which NEVER matches in SQL.
    // Must use .is('col', null) for null comparison.
    if (variantId) {
      existingQuery = existingQuery.eq('variant_id', variantId)
    } else {
      existingQuery = existingQuery.is('variant_id', null)
    }

    const { data: existingItems } = await existingQuery.limit(1)

    // If exists, update quantity
    if (existingItems && existingItems.length > 0) {
      const existingItem = existingItems[0] as CartItemExisting
      const newQuantity = existingItem.quantity + (input.quantity || 1)
      
      const { data: updatedData, error: updateError } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
        .eq('id', existingItem.id)
        .select(CART_ITEM_SELECT_FIELDS)
        .single()

      if (updateError) {
        console.error('[addToCartAction] Update error:', updateError)
        return { data: null, error: updateError.message }
      }

      revalidatePath('/cart')
      return { data: updatedData as CartItem, error: null }
    }

    // Insert new item
    const payload: CartItemInsert = {
      user_id: user.id,
      product_id: input.product_id,
      variant_id: input.variant_id || null,
      product_name: input.product_name,
      product_price: input.product_price,
      product_image: input.product_image || null,
      quantity: input.quantity || 1
    }

    const { data: insertData, error: insertError } = await supabase
      .from('cart_items')
      .insert([payload])
      .select(CART_ITEM_SELECT_FIELDS)
      .single()

    if (insertError) {
      console.error('[addToCartAction] Insert error:', insertError)
      return { data: null, error: insertError.message }
    }

    revalidatePath('/cart')
    return { data: insertData as CartItem, error: null }
  } catch (error: unknown) {
    console.error('[addToCartAction] Exception:', error)
    return { data: null, error: getErrorMessage(error, 'Failed to add to cart') }
  }
}

/**
 * Update cart item quantity
 */
export async function updateCartQuantityAction(cartItemId: string, quantity: number): Promise<{ data: CartItem | null; error: string | null }> {
  try {
    const supabase = await createServerSupabase()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { data: null, error: 'Must be logged in' }
    }

    // If quantity is 0 or less, remove the item
    if (quantity < 1) {
      const { error: deleteError } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', cartItemId)
        .eq('user_id', user.id)

      if (deleteError) {
        console.error('[updateCartQuantityAction] Delete error:', deleteError)
        return { data: null, error: deleteError.message }
      }

      revalidatePath('/cart')
      return { data: null, error: null }
    }

    // Update quantity
    const { data, error } = await supabase
      .from('cart_items')
      .update({ quantity, updated_at: new Date().toISOString() })
      .eq('id', cartItemId)
      .eq('user_id', user.id)
      .select(CART_ITEM_SELECT_FIELDS)
      .single()

    if (error) {
      console.error('[updateCartQuantityAction] Error:', error)
      return { data: null, error: error.message }
    }

    revalidatePath('/cart')
    return { data: data as CartItem, error: null }
  } catch (error: unknown) {
    console.error('[updateCartQuantityAction] Exception:', error)
    return { data: null, error: getErrorMessage(error, 'Failed to update quantity') }
  }
}

/**
 * Remove item from cart
 */
export async function removeFromCartAction(cartItemId: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createServerSupabase()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { success: false, error: 'Must be logged in' }
    }

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', cartItemId)
      .eq('user_id', user.id)

    if (error) {
      console.error('[removeFromCartAction] Error:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/cart')
    return { success: true, error: null }
  } catch (error: unknown) {
    console.error('[removeFromCartAction] Exception:', error)
    return { success: false, error: getErrorMessage(error, 'Failed to remove from cart') }
  }
}

/**
 * Clear all items from cart
 */
export async function clearCartAction(): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createServerSupabase()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { success: false, error: 'Must be logged in' }
    }

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', user.id)

    if (error) {
      console.error('[clearCartAction] Error:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/cart')
    return { success: true, error: null }
  } catch (error: unknown) {
    console.error('[clearCartAction] Exception:', error)
    return { success: false, error: getErrorMessage(error, 'Failed to clear cart') }
  }
}
