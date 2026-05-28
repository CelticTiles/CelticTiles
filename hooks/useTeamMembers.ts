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

      const response = await fetch('/api/admin/team', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.error || `Failed to fetch team members (${response.status})`)
      }

      const payload = await response.json()
      const data = Array.isArray(payload?.team) ? payload.team : Array.isArray(payload?.teamMembers) ? payload.teamMembers : []

      if (!mountedRef.current) return
      
      // Transform to expected format with role name
      const transformed = data.map((member: any) => ({
        id: member.id,
        email: member.email,
        full_name: member.full_name,
        name: member.full_name || '',
        role: (member.role || 'customer') as any,
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

  // Keep admin team pages fresh without requiring focus changes.
  useEffect(() => {
    if (typeof window === 'undefined') return

    const isAdminRoute = window.location.pathname.startsWith('/admin')
    if (!isAdminRoute) return

    const POLL_INTERVAL_MS = 15000
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && !inFlightRef.current) {
        fetchTeamMembers()
      }
    }, POLL_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [fetchTeamMembers])

  async function addTeamMember(member: Omit<TeamMember, 'id' | 'created_at'> & { password: string }) {
    const response = await fetch('/api/admin/team', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: member.full_name,
        email: member.email,
        role: member.role,
        password: member.password,
      }),
    })

    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(result?.error || `Failed to create team member (${response.status})`)
    }

    await fetchTeamMembers()
  }

  async function updateTeamMember(id: string, updates: Partial<TeamMember>) {
    const member = teamMembers.find(m => m.id === id)
    const response = await fetch('/api/admin/team', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        full_name: updates.full_name ?? member?.full_name ?? '',
        email: updates.email ?? member?.email ?? '',
        role: updates.role ?? member?.role ?? 'sales',
      }),
    })

    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(result?.error || `Update failed (${response.status})`)
    }

    await fetchTeamMembers()
  }

  async function deleteTeamMember(id: string) {
    const response = await fetch('/api/admin/team', {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })

    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(result?.error || `Delete failed (${response.status})`)
    }

    setTeamMembers(prev => prev.filter(m => m.id !== id))
  }

  async function resetTeamMemberPassword(userId: string, newPassword: string) {
    const response = await fetch('/api/admin/team/reset-password', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: userId, password: newPassword }),
    })

    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(result?.error || `Password reset failed (${response.status})`)
    }
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
