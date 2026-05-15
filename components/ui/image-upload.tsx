"use client"

import { useState, useRef, useCallback } from 'react'
import { useStorage, STORAGE_PATHS } from '@/hooks/useStorage'
import { X, Loader2, ImageIcon } from 'lucide-react'
import Image from 'next/image'

interface ImageUploadProps {
  productId?: string
  onUploadComplete?: (url: string, imageRecord?: Record<string, unknown>) => void
  onError?: (error: string) => void
  maxSizeMB?: number
  acceptedTypes?: string[]
  className?: string
}

export function ImageUpload({
  productId,
  onUploadComplete,
  onError,
  maxSizeMB = 5,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  className = ''
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  
  const { uploadFile, uploadProductImage, isUploading, error } = useStorage()

  const validateFile = useCallback((file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return `Invalid file type. Accepted: ${acceptedTypes.join(', ')}`
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File too large. Maximum size: ${maxSizeMB}MB`
    }
    return null
  }, [acceptedTypes, maxSizeMB])

  const handleFile = useCallback(async (file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      onError?.(validationError)
      return
    }

    // Show preview
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)

    try {
      if (productId) {
        // Upload and create DB record
        const { imageUrl, imageRecord } = await uploadProductImage(
          productId,
          file,
          true, // is_primary
          0     // display_order
        )
        onUploadComplete?.(imageUrl, imageRecord)
      } else {
        // Just upload, return URL (for new products)
        const result = await uploadFile(file, STORAGE_PATHS.PRODUCT_IMAGES)
        onUploadComplete?.(result.publicUrl)
      }
    } catch (err: unknown) {
      setPreview(null)
      onError?.(err instanceof Error ? err.message : 'Upload failed')
    }
  }, [productId, uploadProductImage, uploadFile, validateFile, onUploadComplete, onError])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const clearPreview = useCallback(() => {
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleInputChange}
        className="hidden"
      />

      {preview ? (
        <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
          <Image
            src={preview}
            alt="Preview"
            fill
            className="object-cover"
          />
          <button
            onClick={clearPreview}
            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          {isUploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            w-full h-48 border-2 border-dashed rounded-lg 
            flex flex-col items-center justify-center gap-3
            cursor-pointer transition-colors
            ${isDragOver 
              ? 'border-primary bg-primary/5' 
              : 'border-gray-300 hover:border-gray-400'
            }
          `}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-10 w-10 text-gray-400 animate-spin" />
              <p className="text-sm text-gray-500">Uploading...</p>
            </>
          ) : (
            <>
              <ImageIcon className="h-10 w-10 text-gray-400" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">
                  Click to upload or drag & drop
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  PNG, JPG, WebP up to {maxSizeMB}MB
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500 mt-2">{error}</p>
      )}
    </div>
  )
}

// Multiple images upload component
interface MultiImageUploadProps {
  productId: string
  existingImages?: { id: string; image_url: string; is_primary: boolean }[]
  onImagesChange?: (images: Record<string, unknown>[]) => void
  maxImages?: number
}

export function MultiImageUpload({
  productId,
  existingImages = [],
  onImagesChange,
  maxImages = 10
}: MultiImageUploadProps) {
  const [images, setImages] = useState(existingImages)
  const { uploadProductImage } = useStorage()

  const handleUpload = useCallback(async (file: File) => {
    if (images.length >= maxImages) return

    try {
      const { imageRecord } = await uploadProductImage(
        productId,
        file,
        images.length === 0, // First image is primary
        images.length
      )
      
      const newImages = [...images, imageRecord as any]
      setImages(newImages)
      onImagesChange?.(newImages)
    } catch (err) {
      console.error('Upload error:', err)
    }
  }, [productId, images, maxImages, uploadProductImage, onImagesChange])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {images.map((img, index) => (
          <div key={img.id} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
            <Image
              src={img.image_url}
              alt={`Product image ${index + 1}`}
              fill
              className="object-cover"
            />
            {img.is_primary && (
              <span className="absolute top-1 left-1 bg-primary text-white text-xs px-2 py-0.5 rounded">
                Primary
              </span>
            )}
          </div>
        ))}
        
        {images.length < maxImages && (
          <ImageUpload
            productId={productId}
            onUploadComplete={(url, record) => {
              if (record) {
                const newImages = [...images, record as any]
                setImages(newImages)
                onImagesChange?.(newImages)
              }
            }}
            className="aspect-square"
          />
        )}
      </div>
      
      <p className="text-xs text-gray-500">
        {images.length} / {maxImages} images uploaded
      </p>
    </div>
  )
}
