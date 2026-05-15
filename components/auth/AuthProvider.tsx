"use client"

import { useEffect, useMemo } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useStore } from "@/hooks/useStore"
import type { UserRole } from "@/lib/auth"

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { login, logout } = useStore()

    const supabase = useMemo(() => getSupabaseBrowserClient(), [])

    useEffect(() => {
        let mounted = true

        if (typeof window === 'undefined') return

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                // Only act on meaningful auth events — ignore TOKEN_REFRESHED, USER_UPDATED, etc.
                if (!mounted) return
                if (event === 'SIGNED_OUT') {
                    await logout()
                    return
                }
                if (event !== 'SIGNED_IN' && event !== 'INITIAL_SESSION') return

                // Skip auto-login on reset-password page — recovery session must not trigger login
                if (window.location.pathname === '/reset-password') return

                if (!session?.user) {
                    await logout()
                    return
                }

                try {
                    const { data: profile } = await supabase
                        .from("profiles")
                        .select("role_id, roles(name)")
                        .eq("id", session.user.id)
                        .single()

                    if (!mounted) return

                    const profileData = profile as any
                    const roleName: UserRole = profileData?.roles?.name || "customer"
                    const user = session.user

                    login(
                        user.id,
                        user.user_metadata?.name || user.email?.split('@')[0] || 'User',
                        user.email || '',
                        roleName
                    )
                } catch (err: any) {
                    if (err?.name !== 'AbortError') {
                        console.error('[AuthProvider] Profile fetch error:', err?.message)
                    }
                }
            }
        )

        return () => {
            mounted = false
            subscription?.unsubscribe()
        }
    }, [supabase, login, logout])

    return <>{children}</>
}
