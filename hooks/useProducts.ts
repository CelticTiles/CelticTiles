"use client"

import { useCallback, useEffect, useState, useRef } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { logClientTiming, normalizeClientError } from '@/lib/client-runtime-utils'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'

// Raw database types matching actual schema
interface DbProduct {
  id: string
  name: string
  slug: string
  subtitle: string | null
  description: string | null
  price: number | null
  image: string | null
  category_id: string | null
  stock: number
  status: string
  low_stock_threshold: number
  is_clearance: boolean // ✅ NEW: Boolean flag for clearance sale
  assigned_code: string | null
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
  created_at: string
  updated_at: string
}

const PRODUCT_BASE_SELECT_FIELDS = 'id, name, slug, subtitle, description, price, image, category_id, stock, status, low_stock_threshold, is_clearance, cost_price, assigned_code, material, size, finish, thickness, sqm_per_box, application_area, brand, availability, panel_length, panel_width, package_included, has_led, created_at, updated_at'

function withImageWidth(url: string | null | undefined, width = 300): string | null {
  if (!url) return null
  if (!/^https?:\/\//i.test(url)) return url

  try {
    const parsed = new URL(url)
    if (!parsed.searchParams.has('width')) {
      parsed.searchParams.set('width', width.toString())
    }
    return parsed.toString()
  } catch {
    const sep = url.includes('?') ? '&' : '?'
    return `${url}${sep}width=${width}`
  }
}

// Transformed Product type for UI
export interface Product {
  id: string
  name: string
  slug: string
  subtitle: string | null
  description: string | null
  price: number
  image: string | null
  images?: string[] // For ProductClient compatibility
  category_id: string | null
  stock: number
  status: string
  low_stock_threshold: number
  is_clearance: boolean // ✅ NEW: Boolean flag for clearance sale
  cost_price?: number | null
  assigned_code: string | null
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
  // For category display
  categories?: { name: string; parent_id: string | null } | null
  categoryName?: string | null
  // Deprecated/legacy fields (for backward compatibility)
  rating?: number
  reviews?: number
  pricePerSqm?: number | null
  coverage?: string | null
  subcategory?: string | null
}

// Transform raw DB product to UI Product
function transformProduct(dbProduct: any): Product {
  // Get primary image from product_images array
  const primaryImageFromTable = withImageWidth(dbProduct.product_images?.find((img: any) => img.is_primary)?.image_url)
  
  // If no primary image in product_images, use first uploaded image
  const firstUploadedImage = withImageWidth(dbProduct.product_images?.[0]?.image_url)
  
  // Fallback to image column, but STRIP timestamp query parameter if present
  let fallbackImage = dbProduct.image
  if (fallbackImage && fallbackImage.includes('?t=')) {
    // Remove the timestamp query parameter that causes 400 errors
    fallbackImage = fallbackImage.split('?t=')[0]
  }
  fallbackImage = withImageWidth(fallbackImage)
  
  // Priority: primary image > first uploaded image > clean image column
  const primaryImage = primaryImageFromTable || firstUploadedImage || fallbackImage
  
  // All images: from product_images table OR from image column (cleaned)
  const allImages = dbProduct.product_images?.map((img: any) => withImageWidth(img.image_url)).filter(Boolean) || 
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
      // Supabase self-join can return empty array [] or object {name: ...}
      const parentCat = Array.isArray(cat.categories) ? cat.categories[0] : cat.categories
      const parentName = parentCat?.name
      return parentName ? `${parentName} > ${cat.name}` : cat.name
    })(),
    // Legacy fields for backward compatibility
    rating: 0,
    reviews: 0,
    pricePerSqm: dbProduct.sqm_per_box ? (dbProduct.price || 0) : null, // If it has sqm_per_box, it handles SQM pricing
    coverage: dbProduct.sqm_per_box || null, // Map sqm_per_box to coverage for compatibility
    subcategory: null,
  }
}

type UseProductsOptions = {
  initialData?: Product[]
  autoFetch?: boolean
  enableLiveSync?: boolean
}

export function useProducts(options: UseProductsOptions = {}) {
  const { initialData = [], autoFetch = true, enableLiveSync = true } = options
  const supabase = getSupabaseBrowserClient()
  const isAdminPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')
  const [products, setProducts] = useState<Product[]>(initialData)
  const [isLoading, setIsLoading] = useState(autoFetch && initialData.length === 0)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const hasLoadedOnceRef = useRef(false)
  const isFetchingRef = useRef(false)
  const productCountRef = useRef(0)
  const productsRef = useRef<Product[]>(initialData)

  useEffect(() => {
    productCountRef.current = products.length
  }, [products.length])

  useEffect(() => {
    productsRef.current = products
  }, [products])

  const withTimeout = useCallback(async <T,>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
      })
      return await Promise.race([promise, timeoutPromise])
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [])

  const fetchProducts = useCallback(async (): Promise<Product[]> => {
    if (isFetchingRef.current) return productsRef.current

    const startedAt = Date.now()
    let rowCount = 0

    try {
      isFetchingRef.current = true

      if (!hasLoadedOnceRef.current) {
        setIsLoading(true)
      }
      setError(null)

      // Fetch products with category info and images
      let data: any[] | null = null
      let fetchError: any = null

      if (isAdminPath) {
        const response = await withTimeout(
          fetch('/api/admin/products/live', {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store',
          }),
          25000,
          'Products request timed out. Please retry.'
        )

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}))
          fetchError = { message: payload?.error || `HTTP ${response.status}` }
        } else {
          const payload = await response.json()
          data = Array.isArray(payload?.products) ? payload.products : []
        }
      } else {
        const result: any = await withTimeout(
          (supabase
            .from('products') as any)
            .select(`${PRODUCT_BASE_SELECT_FIELDS}, categories!category_id(name, parent_id, categories!parent_id(name)), product_images!left(id, image_url, is_primary, display_order)`)
            .order('created_at', { ascending: false })
            .limit(100),
          25000,
          'Products request timed out. Please retry.'
        )
        data = result?.data || []
        fetchError = result?.error || null
      }

      if (!mountedRef.current) return productsRef.current // Don't setState if unmounted

      if (fetchError) {
        const normalizedFetchError = normalizeClientError(fetchError, 'Failed to fetch products')
        if (normalizedFetchError.isAbortLike) {
          setIsLoading(false)
          return productsRef.current
        }
        throw fetchError
      }
      // Transform each product
      const transformedProducts = (data || []).map((p: any) => transformProduct(p))
      rowCount = transformedProducts.length

      if (!mountedRef.current) return transformedProducts // Don't setState if unmounted
      setProducts(transformedProducts)
      return transformedProducts
    } catch (err: unknown) {
      const normalizedError = normalizeClientError(err, 'Failed to fetch products')
      const message = normalizedError.message.toLowerCase()
      const isSessionOrNetworkTransient =
        normalizedError.isAbortLike ||
        normalizedError.code === 'PGRST301' ||
        message.includes('jwt') ||
        message.includes('session') ||
        message.includes('network')

      if (hasLoadedOnceRef.current && productCountRef.current > 0 && isSessionOrNetworkTransient) {
        console.warn('[useProducts] transient refresh issue, keeping previous data', {
          message: normalizedError.message,
          code: normalizedError.code,
        })
        return productsRef.current
      }

      if (normalizedError.isAbortLike) {
        if (mountedRef.current) setIsLoading(false)
        return productsRef.current
      }

      console.warn('[useProducts] fetchProducts failed', {
        message: normalizedError.message,
        code: normalizedError.code,
      })
      if (mountedRef.current) setError(normalizedError.message)
      return productsRef.current
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
        hasLoadedOnceRef.current = true
      }
      isFetchingRef.current = false
      logClientTiming('useProducts.fetchProducts', startedAt, { rowCount })
    }
  }, [isAdminPath, supabase, withTimeout])

  useEffect(() => {
    mountedRef.current = true

    if (!autoFetch) {
      setIsLoading(false)
      hasLoadedOnceRef.current = true
      return () => { mountedRef.current = false }
    }

    fetchProducts()
    return () => { mountedRef.current = false }
  }, [autoFetch, fetchProducts])

  useRealtimeTable({
    table: 'products',
    enabled: enableLiveSync && !isAdminPath,
    onInsert: (row) => {
      const mapped = transformProduct(row)
      setProducts((prev) => {
        const filtered = prev.filter((product) => product.id !== mapped.id)
        return [mapped, ...filtered]
      })
    },
    onUpdate: (row) => {
      const mapped = transformProduct(row)
      setProducts((prev) => prev.map((product) => (product.id === mapped.id ? mapped : product)))
    },
    onDelete: (row) => {
      setProducts((prev) => prev.filter((product) => product.id !== row.id))
    },
  })

  async function addProduct(product: Partial<Product>): Promise<DbProduct | null> {
    // Generate slug from name if not provided
    const slug = product.slug || product.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `product-${Date.now()}`
    
    // Only include fields that exist in the database
    const dbProduct = {
      name: product.name || '',
      slug,
      subtitle: product.subtitle,
      description: product.description,
      price: product.price,
      image: product.image,
      category_id: product.category_id || null,
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
      brand: product.brand,
      availability: product.availability,
      panel_length: product.panel_length,
      panel_width: product.panel_width,
      package_included: product.package_included,
      has_led: product.has_led,
      is_clearance: product.is_clearance,
    }
    
    if (isAdminPath) {
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dbProduct),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.error || 'Failed to create product')
      }

      const payload = await response.json()
      return payload?.product || null
    }

    const { data: newProduct, error: productError} = await supabase
      .from('products')
      .insert([dbProduct] as any)
      .select()
      .single()

    if (productError) throw productError
    
    return newProduct
  }

  async function updateProduct(id: string, updates: Partial<Product>) {
    // Only include fields that exist in the database
    const dbUpdates: Record<string, unknown> = {}
    const allowedFields = [
      'name', 'slug', 'subtitle', 'description', 'price', 'image',
      'category_id', 'stock', 'status', 'low_stock_threshold',
      'assigned_code', 'material', 'size', 'finish', 'thickness',
      'sqm_per_box', 'application_area', 'is_clearance',
      'brand', 'availability', 'panel_length', 'panel_width',
      'package_included', 'has_led'
    ]
    
    for (const field of allowedFields) {
      if (field in updates) {
        dbUpdates[field] = (updates as Record<string, unknown>)[field]
      }
    }

    // Add updated_at timestamp
    dbUpdates['updated_at'] = new Date().toISOString()

    if (Object.keys(dbUpdates).length === 0) {
      throw new Error('No valid fields to update')
    }
    
    if (isAdminPath) {
      const response = await fetch(`/api/admin/products/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dbUpdates),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.error || 'Failed to update product')
      }

      const payload = await response.json()
      return payload?.product
    }

    const { data, error: updateError } = await (supabase as any)
      .from('products')
      .update(dbUpdates)
      .eq('id', id)
      .select('*')

    if (updateError) {
      console.error('Update error:', updateError)
      throw new Error(updateError.message || 'Failed to update product')
    }

    if (!data || data.length === 0) {
      throw new Error('Product not found or update failed')
    }
    
    return data[0]
  }

  async function deleteProduct(id: string) {
    if (isAdminPath) {
      const response = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.error || 'Failed to delete product')
      }

      setProducts(prev => prev.filter(p => p.id !== id))
      return
    }

    const result = await (supabase
      .from('products') as any)
      .delete()
      .eq('id', id)
    const { error } = result || {}

    if (error) throw error
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  function getLowStockProducts() {
    return products.filter(p => p.stock <= p.low_stock_threshold)
  }

  // ✅ NEW: Get only clearance products
  function getClearanceProducts() {
    return products.filter(p => p.is_clearance === true && p.status === 'active')
  }

  // ✅ NEW: Get products from specific category EXCLUDING clearance products
  function getProductsByCategoryExcludingClearance(categoryId: string) {
    return products.filter(p => 
      p.category_id === categoryId && 
      p.status === 'active' && 
      p.is_clearance !== true
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
    getClearanceProducts, // ✅ NEW
    getProductsByCategoryExcludingClearance, // ✅ NEW
    refetch: fetchProducts
  }
}
