import { createServerSupabase } from "@/lib/supabase/server"
import { getNavData, type CategoryWithChildren } from "@/lib/loaders"
import { ProductCard, type ProductCardProduct } from "@/components/products/product-card"
import { CategoryFilters, type FilterGroup } from "@/components/products/category-filters"
import Link from "next/link"

export const revalidate = 60

// Helper to collect all category IDs (parent + all descendants)
function getAllCategoryIds(category: CategoryWithChildren): string[] {
  const ids = [category.id]
  for (const child of category.children) {
    ids.push(...getAllCategoryIds(child))
  }
  return ids
}

// Find a category by ID in the tree structure
function findCategoryById(categories: CategoryWithChildren[], id: string): CategoryWithChildren | null {
  for (const cat of categories) {
    if (cat.id === id) return cat
    const found = findCategoryById(cat.children, id)
    if (found) return found
  }
  return null
}

const PRODUCTS_PER_PAGE = 20

const PRODUCT_CARD_SELECT = 'id, name, slug, price, image, stock, material'
const FILTER_FIELDS_SELECT = 'material, finish, size, thickness, application_area, brand, is_clearance'

const PRICE_OPTIONS = [
  { label: "Under €20", value: "0-20" },
  { label: "€20 – €40", value: "20-40" },
  { label: "€40 – €60", value: "40-60" },
  { label: "Over €60", value: "60-5000" },
]

interface Props {
  searchParams: Promise<{ [key: string]: string | undefined }>
}

export default async function AllProductsPage(props: Props) {
  const supabase = await createServerSupabase()

  // Resolve search params
  const resolvedSearchParams = await props.searchParams
  const params: Record<string, string> = {}
  for (const [k, v] of Object.entries(resolvedSearchParams || {})) {
    if (v) params[k] = v
  }

  const requestedPage = parseInt(params.page || '1', 10)
  const currentPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const offset = (currentPage - 1) * PRODUCTS_PER_PAGE

  // Get categories for hierarchical filtering
  const { categories } = await getNavData()

  // Build query with filters
  let query = supabase
    .from('products')
    .select(PRODUCT_CARD_SELECT, { count: 'exact' })
    .eq('status', 'active')

  // Status filter: clearance vs regular
  if (params.status === 'clearance') {
    query = query.eq('is_clearance', true)
  } else if (params.status === 'regular') {
    query = query.eq('is_clearance', false)
  }

  // Category filter: include parent category AND all its subcategories
  if (params.category) {
    const selectedCategory = findCategoryById(categories, params.category)
    if (selectedCategory) {
      const categoryIds = getAllCategoryIds(selectedCategory)
      query = query.in('category_id', categoryIds)
    } else {
      // Fallback to exact match if category not found in tree
      query = query.eq('category_id', params.category)
    }
  }
  if (params.material) query = query.eq('material', params.material)
  if (params.finish) query = query.eq('finish', params.finish)
  if (params.application_area) query = query.eq('application_area', params.application_area)
  if (params.size) query = query.eq('size', params.size)
  if (params.thickness) query = query.eq('thickness', params.thickness)
  if (params.brand) query = query.eq('brand', params.brand)

  if (params.price) {
    const [min, max] = params.price.split('-').map(Number)
    if (!isNaN(min)) query = query.gte('price', min)
    if (!isNaN(max)) query = query.lte('price', max)
  }

  switch (params.sort) {
    case 'price_asc':
      query = query.order('price', { ascending: true })
      break
    case 'price_desc':
      query = query.order('price', { ascending: false })
      break
    default:
      query = query.order('created_at', { ascending: false })
  }

  query = query.range(offset, offset + PRODUCTS_PER_PAGE - 1)

  const { data: productsRaw, count } = await query
  const products: ProductCardProduct[] = productsRaw ?? []
  const totalProducts = count ?? 0
  const totalPages = Math.ceil(totalProducts / PRODUCTS_PER_PAGE)

  // Build filter groups from ALL products (unfiltered)
  const { data: allProductsRaw } = await supabase
    .from('products')
    .select(FILTER_FIELDS_SELECT)
    .eq('status', 'active')

  const allProds = allProductsRaw ?? []
  const uniqueValues = (field: string) => {
    const vals = allProds
      .map((p: Record<string, unknown>) => p[field])
      .filter((v): v is string => typeof v === "string" && v.trim() !== "")
    return [...new Set(vals)].sort()
  }

  const filterGroups: FilterGroup[] = []

  // Status filter (Regular vs Clearance)
  const hasClearance = allProds.some((p: Record<string, unknown>) => p.is_clearance === true)
  if (hasClearance) {
    filterGroups.push({
      id: "status",
      label: "Status",
      options: [
        { label: "Regular", value: "regular" },
        { label: "Clearance", value: "clearance" },
      ],
    })
  }

  // Category filter (top-level categories)
  if (categories.length > 0) {
    filterGroups.push({
      id: "category",
      label: "Category",
      options: categories.map((c) => ({ label: c.name, value: c.id })),
    })
  }

  const materials = uniqueValues("material")
  if (materials.length > 1) {
    filterGroups.push({
      id: "material",
      label: "Material",
      options: materials.map((m) => ({ label: m, value: m })),
    })
  }

  const finishes = uniqueValues("finish")
  if (finishes.length > 1) {
    filterGroups.push({
      id: "finish",
      label: "Finish",
      options: finishes.map((f) => ({ label: f, value: f })),
    })
  }

  const sizes = uniqueValues("size")
  if (sizes.length > 1) {
    filterGroups.push({
      id: "size",
      label: "Size",
      options: sizes.map((s) => ({ label: s, value: s })),
    })
  }

  const thicknesses = uniqueValues("thickness")
  if (thicknesses.length > 1) {
    filterGroups.push({
      id: "thickness",
      label: "Thickness",
      options: thicknesses.map((t) => ({ label: t, value: t })),
    })
  }

  const areas = uniqueValues("application_area")
  if (areas.length > 1) {
    filterGroups.push({
      id: "application_area",
      label: "Usage",
      options: areas.map((a) => ({ label: a, value: a })),
    })
  }

  const brands = uniqueValues("brand")
  if (brands.length > 1) {
    filterGroups.push({
      id: "brand",
      label: "Brand",
      options: brands.map((b) => ({ label: b, value: b })),
    })
  }

  filterGroups.push({ id: "price", label: "Price", options: PRICE_OPTIONS })



  // Pagination URL builder
  const buildPageUrl = (pageNum: number) => {
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
      if (k !== 'page') p.set(k, v)
    }
    if (pageNum > 1) p.set('page', pageNum.toString())
    const qs = p.toString()
    return `/products${qs ? `?${qs}` : ''}`
  }

  return (
    <>
      <main className="bg-background min-h-screen">
        <div className="container mx-auto max-w-[1400px] px-4 py-12">
          <div className="mb-4 border-b border-border pb-4">
            <h1 className="text-3xl font-serif font-bold text-primary mb-2">All Products</h1>
            <p className="text-muted-foreground">Browse our complete collection</p>
          </div>

          {/* Filters & Sort */}
          <CategoryFilters
            pathname="/products"
            currentParams={params}
            filterGroups={filterGroups}
            totalProducts={totalProducts}
          />

          {products.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {products.map((product: ProductCardProduct) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-12 rounded-2xl bg-[#edf1f7] p-4 shadow-[-8px_-8px_16px_#ffffff,8px_8px_16px_#c8d0dd]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                      {currentPage > 1 && (
                        <Link
                          href={buildPageUrl(currentPage - 1)}
                          prefetch={false}
                          className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 shadow-[-4px_-4px_8px_#ffffff,4px_4px_8px_#c8d0dd] transition hover:shadow-[-2px_-2px_6px_#ffffff,2px_2px_6px_#c8d0dd]"
                        >
                          Previous
                        </Link>
                      )}

                      <div className="flex flex-wrap items-center gap-2">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                          const showPage =
                            pageNum === 1 ||
                            pageNum === totalPages ||
                            Math.abs(pageNum - currentPage) <= 1

                          if (!showPage) {
                            if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                              return (
                                <span
                                  key={pageNum}
                                  className="rounded-xl px-3 py-2 text-sm text-slate-500 shadow-[inset_-3px_-3px_6px_#ffffff,inset_3px_3px_6px_#c8d0dd]"
                                >
                                  ...
                                </span>
                              )
                            }
                            return null
                          }

                          if (pageNum === currentPage) {
                            return (
                              <span
                                key={pageNum}
                                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-800 shadow-[inset_-4px_-4px_8px_#ffffff,inset_4px_4px_8px_#c8d0dd]"
                                aria-current="page"
                              >
                                {pageNum}
                              </span>
                            )
                          }

                          return (
                            <Link
                              key={pageNum}
                              href={buildPageUrl(pageNum)}
                              prefetch={false}
                              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 shadow-[-4px_-4px_8px_#ffffff,4px_4px_8px_#c8d0dd] transition hover:shadow-[-2px_-2px_6px_#ffffff,2px_2px_6px_#c8d0dd]"
                            >
                              {pageNum}
                            </Link>
                          )
                        })}
                      </div>

                      {currentPage < totalPages && (
                        <Link
                          href={buildPageUrl(currentPage + 1)}
                          prefetch={false}
                          className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 shadow-[-4px_-4px_8px_#ffffff,4px_4px_8px_#c8d0dd] transition hover:shadow-[-2px_-2px_6px_#ffffff,2px_2px_6px_#c8d0dd]"
                        >
                          Next
                        </Link>
                      )}
                    </div>

                    <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-end">
                      <span className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 shadow-[inset_-3px_-3px_6px_#ffffff,inset_3px_3px_6px_#c8d0dd]">
                        Page {currentPage} of {totalPages}
                      </span>
                      <form action="/products" method="get" className="flex items-center gap-2">
                        {Object.entries(params)
                          .filter(([k]) => k !== 'page')
                          .map(([k, v]) => (
                            <input key={k} type="hidden" name={k} value={v} />
                          ))}
                        <input
                          type="text"
                          name="page"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          defaultValue={currentPage}
                          aria-label="Jump to page"
                          className="w-20 rounded-xl border-0 bg-[#edf1f7] px-3 py-2 text-sm text-slate-700 shadow-[inset_-4px_-4px_8px_#ffffff,inset_4px_4px_8px_#c8d0dd] focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 shadow-[-4px_-4px_8px_#ffffff,4px_4px_8px_#c8d0dd] transition hover:shadow-[-2px_-2px_6px_#ffffff,2px_2px_6px_#c8d0dd]"
                        >
                          Go
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">No products found matching your filters.</p>
              <p className="text-sm text-muted-foreground mt-2">Try adjusting your filters or check back later.</p>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
