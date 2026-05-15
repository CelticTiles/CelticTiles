"use client"

import { useState, useRef, useCallback } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { X, Upload, Image as ImageIcon, Loader2, GripVertical } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"

export interface ProductImage {
  id: string
  product_id: string
  image_url: string | null
  display_order: number
  is_primary: boolean
  created_at: string
}

interface ProductImageUploadProps {
  productId: string
  images: ProductImage[]
  onImagesChange: (images: ProductImage[]) => void
}

// ─── Component ───────────────────────────────────────────────────────────────
export function ProductImageUpload({ 
  productId, 
  images, 
  onImagesChange
}: ProductImageUploadProps) {
  const supabase = getSupabaseBrowserClient()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [statusText, setStatusText] = useState("")
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ─── Shared file processing (used by both click & drag-and-drop) ──────────
  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => f.type.startsWith("image/"))
    if (fileArray.length === 0) {
      toast.error("No valid image files found")
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const newImages: ProductImage[] = []

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i]

        // Validate raw size (max 25MB)
        if (file.size > 25 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 25MB)`)
          continue
        }

        // ── Upload directly (no compression) ──
        setStatusText(`Uploading ${file.name}...`)
        const ext = file.name.split('.').pop() || 'jpg'
        const fileName = `${productId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`

        let uploadResult: any
        try {
          uploadResult = await supabase
            .storage
            .from("uploads")
            .upload(fileName, file, {
              cacheControl: "3600",
              upsert: false,
              contentType: file.type,
            })
        } catch (uploadErr) {
          console.error("Upload exception:", uploadErr)
          toast.error(`Failed to upload ${file.name}`)
          continue
        }

        if (!uploadResult || uploadResult.error || !uploadResult.data) {
          console.error("Upload error:", uploadResult?.error || "No response from storage API")
          toast.error(`Failed to upload ${file.name}`)
          continue
        }

        const uploadData = uploadResult.data

        // ── Step 3: Get URL & save to DB ──
        const { data: urlData } = supabase
          .storage
          .from("uploads")
          .getPublicUrl(uploadData.path)

        const { data: imageData, error: insertError } = await (supabase
          .from("product_images") as any)
          .insert({
            product_id: productId,
            image_url: urlData.publicUrl,
            display_order: images.length + newImages.length,
            is_primary: images.length === 0 && newImages.length === 0,
          })
          .select()
          .single()

        if (insertError) {
          console.error("Insert error:", insertError)
          toast.error(`Failed to save ${file.name}`)
          await supabase.storage.from("uploads").remove([uploadData.path])
          continue
        }

        newImages.push(imageData)
        setUploadProgress(((i + 1) / fileArray.length) * 100)
      }

      if (newImages.length > 0) {
        onImagesChange([...images, ...newImages])
        toast.success(`${newImages.length} image(s) uploaded successfully`)
      }
    } catch (error) {
      console.error("Upload error:", error)
      toast.error("Failed to upload images")
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      setStatusText("")
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }, [supabase, productId, images, onImagesChange])

  // ─── Click handler ────────────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files)
    }
  }

  // ─── Drag-and-drop for uploading new files ────────────────────────────────
  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    // Only handle file drops (not image reorder drops)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files)
    }
  }, [processFiles])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragOver(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set false if we're leaving the container, not entering a child
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const { clientX, clientY } = e
    if (
      clientX <= rect.left ||
      clientX >= rect.right ||
      clientY <= rect.top ||
      clientY >= rect.bottom
    ) {
      setIsDragOver(false)
    }
  }, [])

  const handleDragOverZone = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = "copy"
  }, [])

  // ─── Drag-to-reorder existing images ──────────────────────────────────────
  const handleReorderDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", String(index)) // mark as reorder, not file
  }

  const handleReorderDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleReorderDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    e.stopPropagation()
    if (draggedIndex === null || draggedIndex === targetIndex) return

    const reordered = [...images]
    const [draggedItem] = reordered.splice(draggedIndex, 1)
    reordered.splice(targetIndex, 0, draggedItem)

    const updatePromises = reordered.map((img, idx) =>
      (supabase
        .from("product_images") as any)
        .update({ display_order: idx })
        .eq("id", img.id)
    )

    try {
      await Promise.all(updatePromises)
      onImagesChange(reordered)
      toast.success("Image order updated")
    } catch (error) {
      console.error("Reorder error:", error)
      toast.error("Failed to reorder images")
    } finally {
      setDraggedIndex(null)
    }
  }

  // ─── Remove & Set Primary ─────────────────────────────────────────────────
  const handleRemoveImage = async (imageId: string, imageUrl: string | null) => {
    try {
      const { error: deleteError } = await supabase
        .from("product_images")
        .delete()
        .eq("id", imageId)

      if (deleteError) throw deleteError

      if (imageUrl) {
        const urlParts = imageUrl.split("/uploads/")
        if (urlParts.length > 1) {
          await supabase.storage.from("uploads").remove([urlParts[1]])
        }
      }

      const updatedImages = images.filter(img => img.id !== imageId)

      if (updatedImages.length > 0 && !updatedImages.some(img => img.is_primary)) {
        const { error } = await (supabase
          .from("product_images") as any)
          .update({ is_primary: true })
          .eq("id", updatedImages[0].id)

        if (!error) {
          updatedImages[0].is_primary = true
        }
      }

      onImagesChange(updatedImages)
      toast.success("Image removed")
    } catch (error) {
      console.error("Delete error:", error)
      toast.error("Failed to remove image")
    }
  }

  const handleSetPrimary = async (imageId: string) => {
    try {
      await (supabase
        .from("product_images") as any)
        .update({ is_primary: false })
        .eq("product_id", productId)

      const { error } = await (supabase
        .from("product_images") as any)
        .update({ is_primary: true })
        .eq("id", imageId)

      if (error) throw error

      onImagesChange(images.map(img => ({
        ...img,
        is_primary: img.id === imageId,
      })))
      toast.success("Primary image updated")
    } catch (error) {
      console.error("Set primary error:", error)
      toast.error("Failed to set primary image")
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header with upload button */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">
          Product Images ({images.length})
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {statusText || `Uploading ${Math.round(uploadProgress)}%`}
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Add Images
            </>
          )}
        </Button>
      </div>

      {/* Existing images grid with drag-to-reorder */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {images.map((image, index) => (
            <div
              key={image.id}
              draggable
              onDragStart={(e) => handleReorderDragStart(e, index)}
              onDragOver={handleReorderDragOver}
              onDrop={(e) => handleReorderDrop(e, index)}
              className={`relative group rounded-lg overflow-hidden border-2 cursor-move transition-all ${
                image.is_primary ? "border-primary" : "border-gray-200"
              } ${draggedIndex === index ? "opacity-50 scale-95" : ""}`}
            >
              <div className="aspect-square relative bg-gray-100">
                {image.image_url ? (
                  <Image
                    src={`${image.image_url}?t=${image.created_at}`}
                    alt="Product image"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                    unoptimized
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Hover overlay with controls */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <GripVertical className="absolute top-2 left-2 w-5 h-5 text-white/70" />
                {!image.is_primary && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => handleSetPrimary(image.id)}
                  >
                    Set Primary
                  </Button>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  onClick={() => handleRemoveImage(image.id, image.image_url)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Primary badge */}
              {image.is_primary && (
                <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                  Primary
                </div>
              )}

              {/* Order indicator */}
              <div className="absolute bottom-2 right-2 bg-gray-700 text-white text-xs px-2 py-1 rounded">
                #{index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drag-and-drop upload zone */}
      <div
        onClick={() => !isUploading && fileInputRef.current?.click()}
        onDrop={handleFileDrop}
        onDragOver={handleDragOverZone}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer
          ${images.length === 0 ? "p-12" : "p-6"}
          ${isDragOver
            ? "border-primary bg-primary/10 scale-[1.01]"
            : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
          }
          ${isUploading ? "pointer-events-none opacity-60" : ""}
        `}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-sm font-medium text-gray-600">{statusText}</p>
            <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className={`p-3 rounded-full transition-colors ${
              isDragOver ? "bg-primary/20" : "bg-gray-100"
            }`}>
              <Upload className={`w-8 h-8 ${isDragOver ? "text-primary" : "text-gray-400"}`} />
            </div>
            <p className="text-sm font-medium text-gray-600">
              {isDragOver ? "Drop images here" : "Drag & drop images here"}
            </p>
            <p className="text-xs text-gray-400">
              or click to browse • PNG, JPG, WebP up to 25MB
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
