"use client"

import { useState, useCallback } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase'

// Bucket name in Supabase Storage
const BUCKET_NAME = 'uploads'

// Subfolder paths
export const STORAGE_PATHS = {
  PRODUCT_IMAGES: 'product_images',
  INVOICES: 'invoices',
  AVATARS: 'avatars'
} as const

export interface UploadResult {
  path: string
  publicUrl: string
}

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

export function useStorage() {
  const supabase = getSupabaseBrowserClient()
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState<UploadProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  /**
   * Upload a file to Supabase Storage
   * @param file - The file to upload
   * @param folder - Subfolder path (e.g., 'product_images', 'invoices')
   * @param customFileName - Optional custom filename (defaults to timestamp + original name)
   */
  const uploadFile = useCallback(async (
    file: File,
    folder: string = STORAGE_PATHS.PRODUCT_IMAGES,
    customFileName?: string
  ): Promise<UploadResult> => {
    try {
      setIsUploading(true)
      setError(null)
      setProgress({ loaded: 0, total: file.size, percentage: 0 })

      // Generate unique filename
      const timestamp = Date.now()
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const fileName = customFileName || `${timestamp}_${cleanFileName}`
      const filePath = `${folder}/${fileName}`

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(data.path)

      setProgress({ loaded: file.size, total: file.size, percentage: 100 })

      return {
        path: data.path,
        publicUrl: urlData.publicUrl
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Upload failed'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsUploading(false)
    }
  }, [supabase])

  /**
   * Upload multiple files
   */
  const uploadFiles = useCallback(async (
    files: File[],
    folder: string = STORAGE_PATHS.PRODUCT_IMAGES
  ): Promise<UploadResult[]> => {
    const results: UploadResult[] = []
    
    for (const file of files) {
      const result = await uploadFile(file, folder)
      results.push(result)
    }
    
    return results
  }, [uploadFile])

  /**
   * Delete a file from storage
   */
  const deleteFile = useCallback(async (filePath: string): Promise<void> => {
    const { error: deleteError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath])

    if (deleteError) {
      throw new Error(deleteError.message)
    }
  }, [supabase])

  /**
   * Get public URL for a file path
   */
  const getPublicUrl = useCallback((filePath: string): string => {
    const { data } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath)
    
    return data.publicUrl
  }, [supabase])

  /**
   * Upload a product image and add to product_images table
   */
  const uploadProductImage = useCallback(async (
    productId: string,
    file: File,
    isPrimary: boolean = false,
    displayOrder: number = 0
  ): Promise<{ imageUrl: string; imageRecord: any }> => {
    // Upload file
    const result = await uploadFile(file, STORAGE_PATHS.PRODUCT_IMAGES)

    // Insert into product_images table
    const { data: imageRecord, error: dbError } = await (supabase
      .from('product_images') as any)
      .insert([{
        product_id: productId,
        image_url: result.publicUrl,
        is_primary: isPrimary,
        display_order: displayOrder
      }])
      .select()
      .single()

    if (dbError) {
      // Rollback: delete uploaded file
      await deleteFile(result.path).catch(() => {})
      throw new Error(dbError.message)
    }

    return {
      imageUrl: result.publicUrl,
      imageRecord
    }
  }, [deleteFile, supabase, uploadFile])

  return {
    uploadFile,
    uploadFiles,
    deleteFile,
    getPublicUrl,
    uploadProductImage,
    isUploading,
    progress,
    error
  }
}
