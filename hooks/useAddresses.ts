"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase-types"

export interface UserAddress {
  id: string
  user_id: string
  label: string | null
  full_name: string
  phone: string
  street: string

  city: string
  state: string
  pincode: string
  country: string | null
  is_default: boolean
  created_at?: string
  updated_at?: string
}

type UserAddressInsert = Database["public"]["Tables"]["customer_addresses"]["Insert"]

export function useAddresses(userId: string | null) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [addresses, setAddresses] = useState<UserAddress[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const fetchIdRef = useRef(0)

  const dedupeAddresses = useCallback((rows: UserAddress[]) => {
    const seen = new Set<string>()
    return rows.filter((addr) => {
      const key = `${addr.street.toLowerCase().trim()}|${addr.city.toLowerCase().trim()}|${addr.pincode.toLowerCase().trim()}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [])

  const fetchAddresses = useCallback(async () => {
    if (!userId) {
      if (mountedRef.current) {
        setAddresses([])
        setIsLoading(false)
      }
      return
    }

    try {
      if (mountedRef.current) {
        setIsLoading(true)
        setError(null)
      }

      const { data, error: fetchError } = await supabase
        .from("customer_addresses")
        .select("*")
        .eq("user_id", userId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false })

      if (fetchError) {
        console.error("[useAddresses] Fetch error:", fetchError.message)
        throw fetchError
      }

      if (mountedRef.current) {
        const typedData = (data ?? []) as UserAddress[]
        setAddresses(dedupeAddresses(typedData))
      }
    } catch (err: unknown) {
      if (mountedRef.current) {
        const message = err instanceof Error ? err.message : "Failed to fetch addresses"
        console.error("[useAddresses] Error:", message)
        setError(message)
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [dedupeAddresses, supabase, userId])

  useEffect(() => {
    mountedRef.current = true
    fetchAddresses()
    return () => {
      mountedRef.current = false
    }
  }, [fetchAddresses])

  const addAddress = async (address: Omit<UserAddress, "id" | "user_id" | "created_at" | "updated_at">) => {
    try {
      if (!userId) throw new Error("User not authenticated")

      const newAddress: UserAddressInsert = {
        ...address,
        user_id: userId as string,
      }

      const { data, error: addError } = await supabase
        .from('customer_addresses')
        .insert([newAddress])
        .select()
        .single()

      if (addError) {
        console.error('[useAddresses.addAddress] ❌ Insert error:', {
          message: addError.message,
          code: addError.code,
          details: addError.details
        })
        throw addError
      }
      


      await fetchAddresses()
      return data
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add address'
      console.error('[useAddresses] Add address error:', message)
      throw err
    }
  }

  const deleteAddress = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('customer_addresses')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
      
      await fetchAddresses()
    } catch (err: unknown) {
      console.error('Error deleting address:', err)
      throw err
    }
  }

  const setDefault = async (id: string) => {
    try {
      if (!userId) throw new Error("User not authenticated")

      // First clear all defaults for this user
      const { error: clearError } = await supabase
        .from('customer_addresses')
        .update({ is_default: false })
        .eq('user_id', userId)

      if (clearError) throw clearError

      // Then set the new default
      const { error: setError } = await supabase
        .from('customer_addresses')
        .update({ is_default: true })
        .eq('id', id)
        .eq('user_id', userId)

      if (setError) throw setError

      await fetchAddresses()
    } catch (err: unknown) {
      console.error('Error setting default address:', err)
      throw err
    }
  }

  const updateAddress = async (
    id: string,
    data: Omit<UserAddress, "id" | "user_id" | "created_at" | "updated_at">
  ) => {
    try {
      if (!userId) throw new Error("User not authenticated")

      const { error: updateError } = await supabase
        .from('customer_addresses')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId)

      if (updateError) throw updateError

      await fetchAddresses()
    } catch (err: unknown) {
      console.error('Error updating address:', err)
      throw err
    }
  }

  return {
    addresses,
    isLoading,
    error,
    addAddress,
    deleteAddress,
    setDefault,
    updateAddress,
    refetch: fetchAddresses
  }
}
