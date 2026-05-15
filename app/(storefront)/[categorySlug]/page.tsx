import { notFound } from "next/navigation"
import { createServerSupabase } from "@/lib/supabase/server"
import { ProductCard } from "@/components/products/product-card"
import { CategoryFilters, type FilterGroup } from "@/components/products/category-filters"
import { Product, Category } from "@/lib/supabase-types"

export const revalidate = 60

const RESERVED_SLUGS = [
  'cart', 'wishlist', 'login', 'register', 'product', 'admin',
  'account', 'checkout', 'about', 'contact', 'faq', 'terms',
  'privacy', 'returns', 'delivery', 'trade', 'clearance', 'payment',
  'test-supabase', 'robots.txt', 'favicon.ico', 'sitemap.xml'
]

const PRICE_OPTIONS = [
  { label: "Under €20", value: "0-20" },
  { label: "€20 – €40", value: "20-40" },
  { label: "€40 – €60", value: "40-60" },
  { label: "Over €60", value: "60-5000" },
]

const PRODUCTS_PER_PAGE = 20
const PRODUCT_CARD_SELECT = 'id, name, slug, price, image, stock, material'
const FILTER_FIELDS_SELECT = 'material, finish, size, thickness, application_area, brand'

function buildFilterGroups(
  products: Product[],
  childCategories: { id: string; name: string; slug: string }[]
): FilterGroup[] {
  const groups: FilterGroup[] = []

  const uniqueValues = (field: keyof Product) => {
    const values = products
      .map((p) => p[field])
      .filter((v): v is string => typeof v === "string" && v.trim() !== "")
    return [...new Set(values)].sort()
  }

  // Sub-categories
  if (childCategories.length > 0) {
    groups.push({
      id: "subcategory",
      label: "Sub Category",
      options: childCategories.map((c) => ({ label: c.name, value: c.id })),
    })
  }

  // Only show filter group if ≥1 distinct value exists
  const material = uniqueValues("material")
  if (material.length >= 1) groups.push({ id: "material", label: "Material", options: material.map((m) => ({ label: m, value: m })) })

  const finish = uniqueValues("finish")
  if (finish.length >= 1) groups.push({ id: "finish", label: "Finish", options: finish.map((f) => ({ label: f, value: f })) })

  const size = uniqueValues("size")
  if (size.length >= 1) groups.push({ id: "size", label: "Size", options: size.map((s) => ({ label: s, value: s })) })

  const thickness = uniqueValues("thickness")
  if (thickness.length >= 1) groups.push({ id: "thickness", label: "Thickness", options: thickness.map((t) => ({ label: t, value: t })) })

  const area = uniqueValues("application_area")
  if (area.length >= 1) groups.push({ id: "application_area", label: "Usage", options: area.map((a) => ({ label: a, value: a })) })

  const brand = uniqueValues("brand")
  if (brand.length >= 1) groups.push({ id: "brand", label: "Brand", options: brand.map((b) => ({ label: b, value: b })) })

  groups.push({ id: "price", label: "Price", options: PRICE_OPTIONS })
  return groups
}

interface Props {
  params: Promise<{ categorySlug: string }>
  searchParams: Promise<{ [key: string]: string | undefined }>
}

export default async function CategoryPage(props: Props) {
  const { categorySlug } = await props.params

  // Block common static-style probes from hitting category DB lookups.
  if (RESERVED_SLUGS.includes(categorySlug) || categorySlug.includes('.')) notFound()

  const supabase = await createServerSupabase()

  // 1. Get category by slug
  const { data: category, error: catError } = await supabase
    .from('categories')
    .select('id, name, slug, description')
    .eq('slug', categorySlug)
    .single()

  if (catError || !category) notFound()
  const typedCategory = category as unknown as Category

  // 2. Get child categories (NO display_order — column doesn't exist)
  const { data: childCategoriesRaw } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('parent_id', typedCategory.id)
    .returns<{ id: string; name: string; slug: string }[]>()

  const childCategories = childCategoriesRaw ?? []

  // 3. Build category IDs: parent + all children
  const categoryIds = [typedCategory.id, ...childCategories.map((c) => c.id)]

  // 4. Read search params
  const resolvedSearchParams = await props.searchParams
  const params: Record<string, string> = {}
  for (const [k, v] of Object.entries(resolvedSearchParams || {})) {
    if (v) params[k] = v
  }

  const requestedPage = parseInt(params.page || '1', 10)
  const currentPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const offset = (currentPage - 1) * PRODUCTS_PER_PAGE

  // 5. Build filtered query
  let query = supabase
    .from('products')
    .select(PRODUCT_CARD_SELECT, { count: 'exact' })
    .eq('status', 'active')

  if (params.subcategory) {
    query = query.eq('category_id', params.subcategory)
  } else {
    query = query.in('category_id', categoryIds)
  }

  if (params.material) query = query.eq('material', params.material)
  if (params.finish) query = query.eq('finish', params.finish)
  if (params.size) query = query.eq('size', params.size)
  if (params.thickness) query = query.eq('thickness', params.thickness)
  if (params.application_area) query = query.eq('application_area', params.application_area)
  if (params.brand) query = query.eq('brand', params.brand)

  if (params.price) {
    const [min, max] = params.price.split('-').map(Number)
    if (!isNaN(min)) query = query.gte('price', min)
    if (!isNaN(max)) query = query.lte('price', max)
  }

  switch (params.sort) {
    case 'price_asc': query = query.order('price', { ascending: true }); break
    case 'price_desc': query = query.order('price', { ascending: false }); break
    default: query = query.order('created_at', { ascending: false })
  }

  query = query.range(offset, offset + PRODUCTS_PER_PAGE - 1)

  const { data: categoryProductsRaw, count } = await query
  const categoryProducts: any[] = categoryProductsRaw ?? []
  const totalProducts = count ?? 0
  const totalPages = Math.ceil(totalProducts / PRODUCTS_PER_PAGE)

  // 6. Get ALL unfiltered products (for building filter option lists)
  const { data: allCategoryProductsRaw } = await supabase
    .from('products')
    .select(FILTER_FIELDS_SELECT)
    .in('category_id', categoryIds)
    .eq('status', 'active')

  const allCategoryProducts: any[] = allCategoryProductsRaw ?? []

  // 7. Build filter groups from unfiltered products
  const filterGroups = buildFilterGroups(allCategoryProducts, childCategories)

  const buildPageUrl = (pageNum: number) => {
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
      if (k !== 'page') p.set(k, v)
    }
    if (pageNum > 1) p.set('page', pageNum.toString())
    const qs = p.toString()
    return `/${categorySlug}${qs ? `?${qs}` : ''}`
  }



  return (
    <>
      <main className="bg-background min-h-screen">
        <div className="container mx-auto max-w-[1400px] px-4 py-12">
          <div className="mb-4 border-b border-border pb-4">
            <h1 className="text-3xl font-serif font-bold text-primary mb-2">{typedCategory.name}</h1>
            {typedCategory.description && (
              <p className="text-muted-foreground">{typedCategory.description}</p>
            )}
          </div>

          <CategoryFilters
            pathname={`/${categorySlug}`}
            currentParams={params}
            filterGroups={filterGroups}
            totalProducts={totalProducts}
          />

          {categoryProducts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">No products match the selected filters.</p>
              <p className="text-sm text-muted-foreground mt-2">Try adjusting or clearing your filters.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {categoryProducts.map((product: any) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-12 rounded-2xl bg-[#edf1f7] p-4 shadow-[-8px_-8px_16px_#ffffff,8px_8px_16px_#c8d0dd]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                      {currentPage > 1 && (
                        <a
                          href={buildPageUrl(currentPage - 1)}
                          className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 shadow-[-4px_-4px_8px_#ffffff,4px_4px_8px_#c8d0dd] transition hover:shadow-[-2px_-2px_6px_#ffffff,2px_2px_6px_#c8d0dd]"
                          aria-label="Previous page"
                        >
                          Previous
                        </a>
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
                            <a
                              key={pageNum}
                              href={buildPageUrl(pageNum)}
                              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 shadow-[-4px_-4px_8px_#ffffff,4px_4px_8px_#c8d0dd] transition hover:shadow-[-2px_-2px_6px_#ffffff,2px_2px_6px_#c8d0dd]"
                              aria-label={`Page ${pageNum}`}
                            >
                              {pageNum}
                            </a>
                          )
                        })}
                      </div>

                      {currentPage < totalPages && (
                        <a
                          href={buildPageUrl(currentPage + 1)}
                          className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 shadow-[-4px_-4px_8px_#ffffff,4px_4px_8px_#c8d0dd] transition hover:shadow-[-2px_-2px_6px_#ffffff,2px_2px_6px_#c8d0dd]"
                          aria-label="Next page"
                        >
                          Next
                        </a>
                      )}
                    </div>

                    <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-end">
                      <span className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 shadow-[inset_-3px_-3px_6px_#ffffff,inset_3px_3px_6px_#c8d0dd]">
                        Page {currentPage} of {totalPages}
                      </span>
                      <form action={`/${categorySlug}`} method="get" className="flex items-center gap-2">
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
          )}
        </div>
      </main>
    </>
  )
}
