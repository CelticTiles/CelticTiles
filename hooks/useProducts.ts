"use client"

import { useCallback, useEffect, useState, useRef } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface Product {
  id: string
  name: string
  slug: string
  subtitle: string | null
  description: string | null
  price: number
  image: string | null
  images?: string[]
  category_id: string | null
  stock: number
  status: string
  low_stock_threshold: number
  is_clearance: boolean
  cost_price?: number | null
  assigned_code: string | null
  model: string | null
  material: string | null
  size: string | null
  finish: string | null
  thickness: string | null
  sqm_per_box: string | null
  application_area: string | null
  brand: string | null
  availability: string | null
  panel_length: string | null
  panel_width: string | null
  package_included: string | null
  has_led: boolean | null
  inStock: boolean
  created_at: string
  updated_at: string
  categories?: { name: string; parent_id: string | null } | null
  categoryName?: string | null
  rating?: number
  reviews?: number
  pricePerSqm?: number | null
  coverage?: string | null
  subcategory?: string | null
}

// ─── Transform ──────────────────────────────────────────────────────────────────

function transformProduct(dbProduct: any): Product {
  const primaryImageFromTable = dbProduct.product_images?.find((img: any) => img.is_primary)?.image_url
  const firstUploadedImage = dbProduct.product_images?.[0]?.image_url

  let fallbackImage = dbProduct.image
  if (fallbackImage && fallbackImage.includes('?t=')) {
    fallbackImage = fallbackImage.split('?t=')[0]
  }

  const primaryImage = primaryImageFromTable || firstUploadedImage || fallbackImage
  const allImages = dbProduct.product_images?.map((img: any) => img.image_url).filter(Boolean) ||
    (primaryImage ? [primaryImage] : [])

  return {
    id: dbProduct.id,
    name: dbProduct.name,
    slug: dbProduct.slug,
    subtitle: dbProduct.subtitle,
    description: dbProduct.description,
    price: dbProduct.price || 0,
    image: primaryImage,
    images: allImages,
    category_id: dbProduct.category_id,
    stock: dbProduct.stock,
    status: dbProduct.status,
    low_stock_threshold: dbProduct.low_stock_threshold,
    is_clearance: dbProduct.is_clearance,
    cost_price: dbProduct.cost_price,
    assigned_code: dbProduct.assigned_code,
    model: dbProduct.model,
    material: dbProduct.material,
    size: dbProduct.size,
    finish: dbProduct.finish,
    thickness: dbProduct.thickness,
    sqm_per_box: dbProduct.sqm_per_box,
    application_area: dbProduct.application_area,
    brand: dbProduct.brand,
    availability: dbProduct.availability,
    panel_length: dbProduct.panel_length,
    panel_width: dbProduct.panel_width,
    package_included: dbProduct.package_included,
    has_led: dbProduct.has_led,
    inStock: dbProduct.stock > 0,
    created_at: dbProduct.created_at,
    updated_at: dbProduct.updated_at,
    categories: dbProduct.categories || null,
    categoryName: (() => {
      if (!dbProduct.categories) return null
      const cat = dbProduct.categories
      const parentCat = Array.isArray(cat.categories) ? cat.categories[0] : cat.categories
      const parentName = parentCat?.name
      return parentName ? `${parentName} > ${cat.name}` : cat.name
    })(),
    rating: 0,
    reviews: 0,
    pricePerSqm: dbProduct.sqm_per_box ? (dbProduct.price || 0) : null,
    coverage: dbProduct.sqm_per_box || null,
    subcategory: null,
  }
}

// ─── Hook ───────────────────────────────────────────────────────────────────────

type UseProductsOptions = {
  initialData?: Product[]
  autoFetch?: boolean
  enableLiveSync?: boolean
}

export function useProducts(options: UseProductsOptions = {}) {
  const { initialData = [], autoFetch = true, enableLiveSync = false } = options
  const supabase = getSupabaseBrowserClient()

  const [products, setProducts] = useState<Product[]>(initialData)
  const [isLoading, setIsLoading] = useState(autoFetch && initialData.length === 0)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const fetchProducts = useCallback(async (): Promise<Product[]> => {
    if (mountedRef.current) {
      setIsLoading(true)
      setError(null)
    }

    try {
      const { data, error: fetchError } = await (supabase
        .from('products') as any)
        .select('*, categories!category_id(name, parent_id, categories!parent_id(name)), product_images!left(id, image_url, is_primary, display_order)')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      const transformed = (data || []).map(transformProduct)
      if (mountedRef.current) setProducts(transformed)
      return transformed
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch products'
      if (mountedRef.current) setError(message)
      return []
    } finally {
      if (mountedRef.current) setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    mountedRef.current = true
    if (autoFetch) fetchProducts()
    return () => { mountedRef.current = false }
  }, [autoFetch, fetchProducts])

  // Realtime sync
  useRealtimeTable({
    table: 'products',
    enabled: enableLiveSync,
    onInsert: (row) => {
      const mapped = transformProduct(row)
      setProducts((prev) => [mapped, ...prev.filter((p) => p.id !== mapped.id)])
    },
    onUpdate: (row) => {
      const mapped = transformProduct(row)
      setProducts((prev) => prev.map((p) => (p.id === mapped.id ? mapped : p)))
    },
    onDelete: (row) => {
      setProducts((prev) => prev.filter((p) => p.id !== row.id))
    },
  })

  // ─── Actions ────────────────────────────────────────────────────────────────

  async function addProduct(product: Partial<Product>) {
    const slug = product.slug || product.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `product-${Date.now()}`

    const dbProduct = {
      name: product.name || '',
      slug,
      subtitle: product.subtitle,
      description: product.description,
      price: product.price,
      image: product.image,
      category_id: product.category_id,
      stock: product.stock || 0,
      status: product.status || 'active',
      low_stock_threshold: product.low_stock_threshold || 5,
      assigned_code: product.assigned_code,
      material: product.material,
      size: product.size,
      finish: product.finish,
      thickness: product.thickness,
      sqm_per_box: product.sqm_per_box,
      application_area: product.application_area,
      model: product.model,
      brand: product.brand,
      availability: product.availability,
      panel_length: product.panel_length,
      panel_width: product.panel_width,
      package_included: product.package_included,
      has_led: product.has_led,
      is_clearance: product.is_clearance,
    }

    const { data: newProduct, error: productError } = await supabase
      .from('products')
      .insert([dbProduct] as any)
      .select()
      .single()

    if (productError) throw productError
    return newProduct
  }

  async function updateProduct(id: string, updates: Partial<Product>) {
    const dbUpdates: Record<string, unknown> = {}
    const allowedFields = [
      'name', 'slug', 'subtitle', 'description', 'price', 'image',
      'category_id', 'stock', 'status', 'low_stock_threshold',
      'assigned_code', 'material', 'size', 'finish', 'thickness',
      'sqm_per_box', 'application_area', 'is_clearance', 'model',
      'brand', 'availability', 'panel_length', 'panel_width',
      'package_included', 'has_led',
    ]

    for (const field of allowedFields) {
      if (field in updates) {
        dbUpdates[field] = (updates as Record<string, unknown>)[field]
      }
    }
    dbUpdates['updated_at'] = new Date().toISOString()

    if (Object.keys(dbUpdates).length <= 1) {
      throw new Error('No valid fields to update')
    }

    const { data, error: updateError } = await (supabase as any)
      .from('products')
      .update(dbUpdates)
      .eq('id', id)
      .select('*')

    if (updateError) throw new Error(updateError.message || 'Failed to update product')
    if (!data || data.length === 0) throw new Error('Product not found or update failed')

    return data[0]
  }

  async function deleteProduct(id: string) {
    const { error } = await (supabase.from('products') as any).delete().eq('id', id)
    if (error) throw error
    setProducts((prev) => prev.filter((p) => p.id !== id))
  }

  function getLowStockProducts() {
    return products.filter((p) => p.stock <= p.low_stock_threshold)
  }

  function getClearanceProducts() {
    return products.filter((p) => p.is_clearance === true && p.status === 'active')
  }

  function getProductsByCategoryExcludingClearance(categoryId: string) {
    return products.filter((p) =>
      p.category_id === categoryId &&
      p.status === 'active' &&
      p.is_clearance !== true,
    )
  }

  return {
    products,
    isLoading,
    error,
    addProduct,
    updateProduct,
    deleteProduct,
    getLowStockProducts,
    getClearanceProducts,
    getProductsByCategoryExcludingClearance,
    refetch: fetchProducts,
  }
}
