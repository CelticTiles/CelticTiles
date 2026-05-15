import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase-types"

export interface SecureCheckoutItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  subtotal: number
}

export interface SecureCheckoutSnapshot {
  items: SecureCheckoutItem[]
  subtotal: number
  discount: number
  tax: number
  shipping_fee: number
  total: number
  coupon_code: string | null
  tax_rate: number
  free_shipping_threshold: number
}

interface CouponRow {
  code: string
  status: string | null
  discount_type: "percentage" | "fixed" | string
  discount_value: number | string | null
  min_order_value: number | string | null
  usage_limit: number | null
  used_count: number | null
  expires_at: string | null
}

type ServerSupabase = SupabaseClient<Database>
type CartItemRow = Database["public"]["Tables"]["cart_items"]["Row"]
type SiteSettingsRow = Pick<Database["public"]["Tables"]["site_settings"]["Row"], "tax_rate" | "free_shipping_threshold">
type ProductStockRow = Pick<Database["public"]["Tables"]["products"]["Row"], "stock">

function parseNumber(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value)
  return Number.isFinite(num) ? num : 0
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function normalizeCouponCode(input: unknown): string | null {
  if (typeof input !== "string") return null
  const code = input.trim().toUpperCase()
  return code.length > 0 ? code : null
}

export function generateSecureOrderNumber(): string {
  const timestamp = Date.now()
  const nonce = Math.floor(1000 + Math.random() * 9000)
  return `ORD-${timestamp}-${nonce}`
}

export async function buildSecureCheckoutSnapshot(
  supabase: ServerSupabase,
  userId: string,
  couponCodeInput?: unknown
): Promise<SecureCheckoutSnapshot> {
  const { data: cartRows, error: cartError } = await supabase
    .from("cart_items")
    .select("product_id, product_name, product_price, quantity")
    .eq("user_id", userId)

  if (cartError) {
    throw new Error("Failed to load cart")
  }

  const items: SecureCheckoutItem[] = ((cartRows ?? []) as CartItemRow[])
    .map((row) => {
      const quantity = Math.max(0, Math.floor(parseNumber(row.quantity)))
      const unitPrice = Math.max(0, round2(parseNumber(row.product_price)))
      return {
        product_id: String(row.product_id),
        product_name: String(row.product_name),
        quantity,
        unit_price: unitPrice,
        subtotal: round2(unitPrice * quantity),
      }
    })
    .filter((item: SecureCheckoutItem) => item.product_id && item.quantity > 0)

  if (items.length === 0) {
    throw new Error("Cart is empty")
  }

  const subtotal = round2(items.reduce((sum, item) => sum + item.subtotal, 0))

  const { data: settings } = await supabase
    .from("site_settings")
    .select("tax_rate, free_shipping_threshold")
    .eq("id", 1)
    .maybeSingle()

  const typedSettings = settings as SiteSettingsRow | null
  const taxRate = Math.max(0, parseNumber(typedSettings?.tax_rate))
  const freeShippingThreshold = Math.max(0, parseNumber(typedSettings?.free_shipping_threshold))

  let discount = 0
  let couponCode: string | null = null

  const normalizedCoupon = normalizeCouponCode(couponCodeInput)
  if (normalizedCoupon) {
    const { data: coupon, error: couponError } = await supabase
      .from("coupons")
      .select("code, status, discount_type, discount_value, min_order_value, usage_limit, used_count, expires_at")
      .eq("code", normalizedCoupon)
      .maybeSingle()

    if (couponError || !coupon) {
      throw new Error("Invalid coupon code")
    }

    const typedCoupon = coupon as CouponRow
    if (typedCoupon.status !== "active") {
      throw new Error("Coupon is not active")
    }

    if (typedCoupon.expires_at && new Date(typedCoupon.expires_at) < new Date()) {
      throw new Error("Coupon has expired")
    }

    const minOrderValue = Math.max(0, parseNumber(typedCoupon.min_order_value))
    if (minOrderValue > 0 && subtotal < minOrderValue) {
      throw new Error(`Minimum order value for this coupon is ${minOrderValue}`)
    }

    const usageLimit = typedCoupon.usage_limit ?? null
    const usedCount = typedCoupon.used_count ?? 0
    if (usageLimit !== null && usedCount >= usageLimit) {
      throw new Error("Coupon usage limit reached")
    }

    const discountValue = Math.max(0, parseNumber(typedCoupon.discount_value))
    if (typedCoupon.discount_type === "percentage") {
      discount = round2(subtotal * (discountValue / 100))
    } else {
      discount = round2(Math.min(discountValue, subtotal))
    }

    couponCode = typedCoupon.code
  }

  const discountedSubtotal = round2(Math.max(0, subtotal - discount))
  const tax = round2(discountedSubtotal * (taxRate / 100))

  // Delivery is quote-based currently; no flat shipping fee is charged.
  const shippingFee = 0
  const total = round2(discountedSubtotal + tax + shippingFee)

  return {
    items,
    subtotal,
    discount,
    tax,
    shipping_fee: shippingFee,
    total,
    coupon_code: couponCode,
    tax_rate: taxRate,
    free_shipping_threshold: freeShippingThreshold,
  }
}

export async function incrementCouponUsage(
  supabase: ServerSupabase,
  couponCode: string | null
): Promise<void> {
  if (!couponCode) return

  const { data, error } = await supabase
    .from("coupons")
    .select("used_count")
    .eq("code", couponCode)
    .maybeSingle()

  if (error || !data) return

  const nextCount = (data.used_count ?? 0) + 1
  await supabase
    .from("coupons")
    .update({ used_count: nextCount })
    .eq("code", couponCode)
}

export async function deductStockForOrderItems(
  supabase: ServerSupabase,
  items: Array<{ product_id: string; quantity: number }>
): Promise<Array<{ product_id: string; success: boolean; reason?: string }>> {
  const results: Array<{ product_id: string; success: boolean; reason?: string }> = []

  for (const item of items) {
    if (!item.product_id || item.quantity <= 0) {
      results.push({
        product_id: item.product_id || "unknown",
        success: false,
        reason: "Invalid item payload",
      })
      continue
    }

    const { data: product, error: fetchError } = await supabase
      .from("products")
      .select("stock")
      .eq("id", item.product_id)
      .single()

    if (fetchError || !product) {
      results.push({
        product_id: item.product_id,
        success: false,
        reason: "Product not found",
      })
      continue
    }

    const typedProduct = product as ProductStockRow
    const currentStock = Math.max(0, parseNumber(typedProduct.stock))
    const newStock = Math.max(0, currentStock - item.quantity)

    const { error: updateError } = await supabase
      .from("products")
      .update({ stock: newStock })
      .eq("id", item.product_id)

    if (updateError) {
      results.push({
        product_id: item.product_id,
        success: false,
        reason: updateError.message,
      })
      continue
    }

    results.push({
      product_id: item.product_id,
      success: true,
    })
  }

  return results
}
