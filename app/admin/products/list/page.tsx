import { getServerSession } from "@/lib/loaders"
import { redirect } from "next/navigation"
import { createServerSupabase } from "@/lib/supabase/server"
import ProductsListClient from "./ProductsListClient"

export interface ProductData {
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
  is_clearance: boolean
  assigned_code: string | null
  material: string | null
  size: string | null
  finish: string | null
  thickness: string | null
  sqm_per_box: string | null
  application_area: string | null
  created_at: string
  updated_at: string
  inStock?: boolean
}

export default async function ProductsListPage() {
  const session = await getServerSession()

  // Allow admin, sales, and inventory roles
  if (!session || (session.userRole !== "admin" && session.userRole !== "sales" && session.userRole !== "inventory")) {
    redirect("/")
  }

  const supabase = await createServerSupabase()

  // Use wildcard select like the hook does, plus relationships
  const { data: products, error } = await supabase
    .from("products")
    .select('*, categories!category_id(name, parent_id), product_images!left(id, image_url, is_primary, display_order)')
    .order("created_at", { ascending: false })

  if (error) {
    console.error('[Admin Products] Database error:', error)
    throw new Error(`Failed to load products: ${error.message}`)
  }

  // Transform to include computed fields
  const productsWithInStock = (products || []).map((p: any) => {
    // Compute categoryName from categories data
    let categoryName = null
    if (p.categories) {
      const cat = p.categories
      // Handle parent category - can be array or object
      const parentCat = Array.isArray(cat.categories) ? cat.categories[0] : cat.categories
      const parentName = parentCat?.name
      categoryName = parentName ? `${parentName} > ${cat.name}` : cat.name
    }
    
    return {
      ...p,
      inStock: p.stock > (p.low_stock_threshold || 0),
      categoryName
    }
  })

  return <ProductsListClient initialProducts={productsWithInStock} userRole={session.userRole as "admin" | "sales" | "inventory"} />
}

