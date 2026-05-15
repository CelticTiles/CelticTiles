"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useCategories } from "@/hooks/useCategories"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { ProductImageUpload, ProductImage } from "@/components/admin/ProductImageUpload"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

interface ProductFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave?: () => Promise<void> | void // Called after successful save to trigger refetch
  product?: any | null // If null, we are in "Create" mode
}

export function ProductFormModal({ isOpen, onClose, onSave, product }: ProductFormModalProps) {
  const supabase = getSupabaseBrowserClient()
  const { categories } = useCategories()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingProduct, setIsLoadingProduct] = useState(false)
  const [productImages, setProductImages] = useState<ProductImage[]>([])
  const [createdProductId, setCreatedProductId] = useState<string | null>(null)

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    subtitle: "", // Model / Size
    category_id: "",
    sku: "",
    price: "",
    stock: "",
    status: "active",
    environment: "Indoor", // Default
    description: "",
    material: "",
    finish: "",
    thickness: "",
    sqm_per_box: "",
    brand: "",
    availability: "",
    panel_length: "",
    panel_width: "",
    package_included: "",
    has_led: false,
    is_clearance: false, // ✅ NEW: Clearance flag
  })

  // Format categories with parent names for hierarchy display
  const formattedCategories = useMemo(() => {
    return categories.map((cat) => {
      const parent = categories.find(p => p.id === cat.parent_id)
      return {
        ...cat,
        displayName: parent ? `${parent.name} > ${cat.name}` : cat.name
      }
    }).sort((a, b) => a.displayName.localeCompare(b.displayName))
  }, [categories])

  // Fetch existing images when editing a product
  useEffect(() => {
  async function fetchProductImages() {
    if (!product?.id) {
      setProductImages([])
      setIsLoadingProduct(false)
      return
    }

    setIsLoadingProduct(true)

    try {
      const { data, error } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', product.id)
        .order('display_order', { ascending: true })

      if (error) {
        toast.error(`Failed to load product images: ${error.message}`)
        setProductImages([])
        return
      }

      setProductImages(
  (data || []).map((img: any) => ({
    ...img,
    display_order: img.display_order ?? 0
  }))
)
    } catch {
      toast.error("Failed to load product images")
      setProductImages([])
    } finally {
      setIsLoadingProduct(false)
    }
  }

  if (product?.id && isOpen) {
    fetchProductImages()
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [product?.id, isOpen])

  // Initialize form when product changes
  useEffect(() => {
    if (product) {
        // Edit Mode
        setFormData({
            name: product.name || "",
            subtitle: product.subtitle || "",
            category_id: product.category_id || "",
            sku: product.assigned_code || "",
            price: product.price?.toString() || "0",
            stock: product.stock?.toString() || "0",
            status: product.status || "active",
            environment: product.application_area || "Indoor",
            description: product.description || "",
            material: product.material || "",
            finish: product.finish || "",
            thickness: product.thickness || "",
            sqm_per_box: product.sqm_per_box || "",
            brand: product.brand || "",
            availability: product.availability || "",
            panel_length: product.panel_length || "",
            panel_width: product.panel_width || "",
            package_included: product.package_included || "",
            has_led: product.has_led || false,
            is_clearance: product.is_clearance || false // ✅ Boolean from database
        })
    } else {
        // Create Mode (Reset)
        setFormData({
            name: "",
            subtitle: "",
            category_id: "",
            sku: "",
            price: "",
            stock: "",
            status: "active",
            environment: "Indoor",
            description: "",
            material: "",
            finish: "",
            thickness: "",
            sqm_per_box: "",
            brand: "",
            availability: "",
            panel_length: "",
            panel_width: "",
            package_included: "",
            has_led: false,
            is_clearance: false // ✅ Default to false for new products
        })
        setProductImages([])
        setCreatedProductId(null)
    }
  }, [product, isOpen])

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
        const payload = {
            name: formData.name,
            subtitle: formData.subtitle,
            category_id: formData.category_id,
            assigned_code: formData.sku, // Map sku field to assigned_code column
            price: parseFloat(formData.price) || 0,
            stock: parseInt(formData.stock) || 0,
            status: formData.status,
            application_area: formData.environment, // Map environment to application_area column
            description: formData.description,
            material: formData.material,
            finish: formData.finish,
            thickness: formData.thickness,
            sqm_per_box: formData.sqm_per_box,
            brand: formData.brand,
            availability: formData.availability,
            panel_length: formData.panel_length,
            panel_width: formData.panel_width,
            package_included: formData.package_included,
            has_led: formData.has_led,
            is_clearance: Boolean(formData.is_clearance)
        }

        const endpoint = product 
  ? `/api/admin/products/${product.id}`
  : `/api/admin/products`

const method = product ? "PATCH" : "POST"

const res = await fetch(endpoint, {
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
})

if (!res.ok) {
  throw new Error("Failed to save product")
}

if (!product) {
  const newProduct = await res.json()
  if (newProduct?.id) {
    setCreatedProductId(newProduct.id)
    toast.success("Product created! You can now add images.")
    return
  }
}

toast.success(product ? "Product updated successfully" : "Product created successfully")

await onSave?.()
  } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : "Failed to save product")
    } finally {
        setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Edit Product" : "Add New Product"}</DialogTitle>
          <DialogDescription>
            {product ? "Update the product details below." : "Fill in the product details below to create a new product."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Section 1: Identity */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input 
                id="name" 
                value={formData.name} 
                onChange={(e) => handleChange("name", e.target.value)} 
                required 
                placeholder="e.g. Premium Ceramic Tile"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitle</Label>
              <Input 
                id="subtitle" 
                value={formData.subtitle} 
                onChange={(e) => handleChange("subtitle", e.target.value)} 
                placeholder="Product summary or subtitle"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select 
                value={formData.category_id} 
                onValueChange={(val) => handleChange("category_id", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {formattedCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
               <Label htmlFor="sku">SKU / Code</Label>
               <Input 
                id="sku" 
                value={formData.sku} 
                onChange={(e) => handleChange("sku", e.target.value)} 
                placeholder="PROD-001"
              />
            </div>
          </div>

          {/* Section 2: Pricing & Inventory */}
          <div className="grid grid-cols-3 gap-4">
             <div className="space-y-2">
               <Label htmlFor="price">Price (€)</Label>
               <Input 
                id="price" 
                type="number"
                step="0.01"
                value={formData.price} 
                onChange={(e) => handleChange("price", e.target.value)} 
                required
              />
             </div>
             <div className="space-y-2">
               <Label htmlFor="stock">Stock</Label>
               <Input 
                id="stock" 
                type="number"
                value={formData.stock} 
                onChange={(e) => handleChange("stock", e.target.value)} 
                required
              />
             </div>
             <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                    value={formData.status} 
                    onValueChange={(val) => handleChange("status", val)}
                >
                    <SelectTrigger>
                    <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                </Select>
             </div>
          </div>

          {/* Section 3: Specs/Env */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="environment">Environment</Label>
                <Select 
                    value={formData.environment} 
                    onValueChange={(val) => handleChange("environment", val)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select Environment" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Indoor">Indoor</SelectItem>
                        <SelectItem value="Outdoor">Outdoor</SelectItem>
                        <SelectItem value="Both">Both</SelectItem>
                    </SelectContent>                </Select>
            </div>
          </div>

          {/* Section 4: Specifications */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold text-slate-700">Specifications</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="material">Material</Label>
                <Input 
                  id="material" 
                  value={formData.material} 
                  onChange={(e) => handleChange("material", e.target.value)} 
                  placeholder="e.g. Porcelain"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="finish">Finish</Label>
                <Input 
                  id="finish" 
                  value={formData.finish} 
                  onChange={(e) => handleChange("finish", e.target.value)} 
                  placeholder="e.g. Glossy"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="thickness">Thickness</Label>
                <Input 
                  id="thickness" 
                  value={formData.thickness} 
                  onChange={(e) => handleChange("thickness", e.target.value)} 
                  placeholder="e.g. 9mm"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sqm_per_box">SQM per Box</Label>
                <Input 
                  id="sqm_per_box" 
                  value={formData.sqm_per_box} 
                  onChange={(e) => handleChange("sqm_per_box", e.target.value)} 
                  placeholder="e.g. 1.44"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Input 
                  id="brand" 
                  value={formData.brand} 
                  onChange={(e) => handleChange("brand", e.target.value)} 
                  placeholder="e.g. Celtic Tiles"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="availability">Availability</Label>
                <Input 
                  id="availability" 
                  value={formData.availability} 
                  onChange={(e) => handleChange("availability", e.target.value)} 
                  placeholder="e.g. In Stock"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="panel_length">Panel Length</Label>
                <Input 
                  id="panel_length" 
                  value={formData.panel_length} 
                  onChange={(e) => handleChange("panel_length", e.target.value)} 
                  placeholder="e.g. 120cm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="panel_width">Panel Width</Label>
                <Input 
                  id="panel_width" 
                  value={formData.panel_width} 
                  onChange={(e) => handleChange("panel_width", e.target.value)} 
                  placeholder="e.g. 60cm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="package_included">Package Included</Label>
                <Input 
                  id="package_included" 
                  value={formData.package_included} 
                  onChange={(e) => handleChange("package_included", e.target.value)} 
                  placeholder="e.g. 4 tiles"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleChange("has_led", !formData.has_led)}>
              <div className={`
                  w-5 h-5 rounded flex items-center justify-center flex-shrink-0
                  transition-all duration-200
                  ${formData.has_led
                      ? 'bg-primary shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.1)]'
                      : 'bg-[#E5E9F0] shadow-[2px_2px_4px_rgba(0,0,0,0.1),-2px_-2px_4px_rgba(255,255,255,0.9)]'
                  }
              `}>
                  {formData.has_led && (
                      <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M5 13l4 4L19 7" />
                      </svg>
                  )}
              </div>
              <Label className="cursor-pointer">Has LED lighting</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input 
                id="description" 
                value={formData.description} 
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Product description..." 
            />
          </div>

          {/* ✅ NEW: Clearance Toggle */}
          <div className="space-y-2 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleChange("is_clearance", !formData.is_clearance)}>
              <div className={`
                  w-5 h-5 rounded flex items-center justify-center flex-shrink-0
                  transition-all duration-200
                  ${Boolean(formData.is_clearance)
                      ? 'bg-red-500 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.1)]'
                      : 'bg-[#E5E9F0] shadow-[2px_2px_4px_rgba(0,0,0,0.1),-2px_-2px_4px_rgba(255,255,255,0.9)]'
                  }
              `}>
                  {Boolean(formData.is_clearance) && (
                      <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M5 13l4 4L19 7" />
                      </svg>
                  )}
              </div>
              <span className="font-semibold text-red-700">🔥 Mark as Clearance Sale</span>
            </div>
            <p className="text-xs text-red-600 ml-8">Product will appear on dedicated Clearance page and be excluded from category listings</p>
          </div>

          {/* Product Images Section */}
          {(product?.id || createdProductId) && (
            <div className="border-t pt-4 mt-4">
              <ProductImageUpload
                productId={product?.id || createdProductId!}
                images={productImages}
                onImagesChange={setProductImages}
              />
            </div>
          )}

          {!product && !createdProductId && (
            <div className="border-t pt-4 mt-4">
              <p className="text-sm text-muted-foreground">
                💡 Create the product first, then you can add images.
              </p>
            </div>
          )}


        <DialogFooter>
          <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
            {createdProductId ? "Done" : "Cancel"}
          </Button>
          {!createdProductId && (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {product ? "Save Changes" : "Create Product"}
            </Button>
          )}
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
