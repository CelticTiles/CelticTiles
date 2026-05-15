export interface TeamMember {
  id: string
  name: string | null
  full_name?: string | null
  email: string
  role: string
  created_at?: string
  updated_at?: string
}

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
