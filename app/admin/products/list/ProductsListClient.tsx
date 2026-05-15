"use client"

import { useState, useMemo, useEffect } from "react"
import { useProducts, Product } from "@/hooks/useProducts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ProductsTable } from "@/components/admin/ProductsTable"
import { Input } from "@/components/ui/input"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Search, Filter, Package, Plus } from "lucide-react"
import { Pagination } from "@/components/admin/Pagination"
import { EmptyState } from "@/components/admin/EmptyState"
import { usePagination } from "@/hooks/usePagination"
import { Button } from "@/components/ui/button"
import { ProductFormModal } from "@/components/admin/ProductFormModal"
import type { ProductData } from "./page"

interface ProductsListClientProps {
  initialProducts: ProductData[]
  userRole: "admin" | "sales" | "inventory"
}

export default function ProductsListClient({ initialProducts, userRole }: ProductsListClientProps) {
  const canEdit = userRole !== "inventory"
  const [products, setProducts] = useState<ProductData[]>(initialProducts)
  const { addProduct, updateProduct, deleteProduct, refetch } = useProducts({
    initialData: initialProducts as any,
    autoFetch: false,
    enableLiveSync: true,
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")

  const uniqueCategories = useMemo(() => {
    const categories = new Set<string>()
    products.forEach(p => {
      if ((p as any).categoryName) categories.add((p as any).categoryName)
    })
    return Array.from(categories).sort()
  }, [products])
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  const handleAddProduct = () => {
    setSelectedProduct(null)
    setIsModalOpen(true)
  }

  const handleEditProduct = (product: any) => {
    setSelectedProduct(product)
    setIsModalOpen(true)
  }

  const handleSaved = async () => {
    const latest = await refetch()
    if (Array.isArray(latest)) {
      setProducts(latest as any)
    }
    setIsModalOpen(false)
    setSelectedProduct(null)
  }
  
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.slug.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = 
        statusFilter === "all" ? true :
        statusFilter === "clearance" ? product.is_clearance :
        statusFilter === "no-images" ? !product.image :
        product.status === statusFilter

      const matchesCategory = categoryFilter === "all" || (product as any).categoryName === categoryFilter

      return matchesSearch && matchesStatus && matchesCategory
    })
  }, [products, searchTerm, statusFilter, categoryFilter])

  const { 
    currentPage, 
    totalPages, 
    goToPage, 
    startIndex, 
    endIndex,
    itemsPerPage
  } = usePagination({ 
    totalItems: filteredProducts.length,
    itemsPerPage: 10
  })

  const currentProducts = filteredProducts.slice(startIndex, endIndex)

  useEffect(() => {
    goToPage(1)
  }, [searchTerm, statusFilter, categoryFilter, goToPage])

  return (
    <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-serif font-bold text-primary">Products</h1>
              <p className="text-muted-foreground mt-1">Manage your product catalog</p>
            </div>
            
            {canEdit && (
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Button className="w-full sm:w-auto" onClick={handleAddProduct}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto justify-end">
             <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <SelectValue placeholder="Category" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {uniqueCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <SelectValue placeholder="Status" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="clearance">Clearance</SelectItem>
                  <SelectItem value="no-images">No Images</SelectItem>
                </SelectContent>
              </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                All Products ({filteredProducts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredProducts.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="No products found"
                  description="Try adjusting your search or filter to find what you're looking for."
                  actionLabel={searchTerm || statusFilter !== "all" || categoryFilter !== "all" ? "Clear Filters" : canEdit ? "Add Product" : undefined}
                  onAction={() => {
                    if (searchTerm || statusFilter !== "all" || categoryFilter !== "all") {
                      setSearchTerm("")
                      setStatusFilter("all")
                      setCategoryFilter("all")
                    } else if (canEdit) {
                       handleAddProduct()
                    }
                  }}
                />
              ) : (
                <>
                  <ProductsTable
                    products={currentProducts as any}
                    onDelete={canEdit ? deleteProduct : undefined}
                    onEdit={canEdit ? handleEditProduct : undefined}
                  />
                  {totalPages > 1 && (
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={goToPage}
                      totalItems={filteredProducts.length}
                      itemsPerPage={itemsPerPage}
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Product Modal */}
          {isModalOpen && canEdit && (
            <ProductFormModal
              isOpen={isModalOpen}
              onClose={() => {
                setIsModalOpen(false)
                setSelectedProduct(null)
              }}
              onSave={handleSaved}
              product={selectedProduct}
            />
          )}

    </div>
  )
}
