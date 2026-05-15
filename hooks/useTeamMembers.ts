"use client"

import { useEffect, useState, useCallback, useRef } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase'

export interface TeamMember {
  id: string
  email: string
  full_name: string | null
  name: string // Mapped property
  role: 'admin' | 'sales'
  permissions: string[] | null
  created_at: string
}

export function useTeamMembers() {
  const supabase = getSupabaseBrowserClient()
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const inFlightRef = useRef(false)

  const fetchTeamMembers = useCallback(async () => {
    if (inFlightRef.current) return

    try {
      inFlightRef.current = true
      setIsLoading(true)
      setError(null)
      
      const result = await (supabase
        .from('profiles') as any)
        .select(`
          id,
          email,
          full_name,
          role_id,
          permissions,
          created_at,
          role:roles(name)
        `)
        .not('role_id', 'is', null)
        .order('created_at', { ascending: false })
      const { data, error: fetchError } = result || {}

      if (!mountedRef.current) return
      if (fetchError) throw fetchError
      
      // Transform to expected format with role name
      const transformed = (data || []).map((member: any) => ({
        id: member.id,
        email: member.email,
        full_name: member.full_name,
        name: member.full_name || '',
        role: (member.role?.name || 'customer') as any,
        permissions: member.permissions,
        created_at: member.created_at
      }))
      
      if (mountedRef.current) {
        setTeamMembers(transformed.filter((m: any) => {
          const role = m.role?.toLowerCase() || ''
          return role === 'admin' || role === 'sales'
        }))
      }
    } catch (err: any) {
      if (mountedRef.current) setError(err.message || 'Failed to fetch team members')
    } finally {
      inFlightRef.current = false
      if (mountedRef.current) setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    mountedRef.current = true
    fetchTeamMembers()
    return () => { mountedRef.current = false }
  }, [fetchTeamMembers])


  async function addTeamMember(member: Omit<TeamMember, 'id' | 'created_at'> & { password: string }) {
    // Create Supabase Auth account first
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: member.email,
      password: member.password,
      email_confirm: true,
      user_metadata: {
        full_name: member.full_name,
        role: member.role
      }
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('Failed to create user')

    // Get role_id from role name
    const roleResult = await (supabase
      .from('roles') as any)
      .select('id')
      .eq('name', member.role)
      .single()
    const { data: roleData } = roleResult || {}

    if (!roleData) throw new Error(`Role ${member.role} not found`)

    // Create profile with auth user id
    const insertResult = await (supabase
      .from('profiles') as any)
      .insert([{
        id: authData.user.id,
        email: member.email,
        full_name: member.full_name,
        role_id: roleData.id,
        permissions: member.permissions
      }])
      .select(`
        id,
        email,
        full_name,
        permissions,
        created_at,
        role:roles(name)
      `)
      .single()
    const { data, error } = insertResult || {}

    if (error) throw error
    
    const transformed = {
      id: data.id,
      email: data.email,
      full_name: data.full_name,
      name: data.full_name || '',
      role: ((data as any).role?.name || 'sales') as 'admin' | 'sales',
      permissions: data.permissions,
      created_at: data.created_at
    }
    
    setTeamMembers(prev => [transformed, ...prev])
    return transformed
  }

  async function updateTeamMember(id: string, updates: Partial<TeamMember>) {
    const updateData: any = {}
    
    if (updates.full_name !== undefined) updateData.full_name = updates.full_name
    if (updates.permissions !== undefined) updateData.permissions = updates.permissions
    
    // If role is being updated, get role_id
    if (updates.role) {
      const updateRoleResult = await (supabase
        .from('roles') as any)
        .select('id')
        .eq('name', updates.role)
        .single()
      const { data: roleData } = updateRoleResult || {}
      
      if (roleData) updateData.role_id = roleData.id
    }

    const updateResult = await (supabase
      .from('profiles') as any)
      .update(updateData)
      .eq('id', id)
      .select(`
        id,
        email,
        full_name,
        permissions,
        created_at,
        role:roles(name)
      `)
      .single()
    const { data, error } = updateResult || {}

    if (error) throw error
    
    const transformed = {
      id: data.id,
      email: data.email,
      full_name: data.full_name,
      name: data.full_name || '',
      role: ((data as any).role?.name || 'sales') as 'admin' | 'sales',
      permissions: data.permissions,
      created_at: data.created_at
    }
    
    setTeamMembers(prev => prev.map(m => m.id === id ? transformed : m))
    return transformed
  }

  async function deleteTeamMember(id: string) {
    // Delete auth user first
    const { error: authError } = await supabase.auth.admin.deleteUser(id)
    if (authError) console.error('Auth delete error:', authError)

    // Delete profile
    const deleteResult = await (supabase
      .from('profiles') as any)
      .delete()
      .eq('id', id)
    const { error } = deleteResult || {}

    if (error) throw error
    setTeamMembers(prev => prev.filter(m => m.id !== id))
  }

  async function resetTeamMemberPassword(userId: string, newPassword: string) {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword
    })
    if (error) throw error
  }

  return {
    teamMembers,
    isLoading,
    error,
    addTeamMember,
    updateTeamMember,
    deleteTeamMember,
    resetTeamMemberPassword,
    refetch: fetchTeamMembers
  }
}
