"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/hooks/useStore"

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, canAccessDashboard, _hasHydrated } = useStore()

  // Redirect if not authorized - only after hydration
  useEffect(() => {
    if (_hasHydrated && (!user || !canAccessDashboard())) {
      router.push("/login")
    }
  }, [_hasHydrated, user, canAccessDashboard, router])

  // Show nothing while hydrating
  if (!_hasHydrated) {
    return null
  }

  // Don't render if not authorized
  if (!user || !canAccessDashboard()) {
    return null
  }

  return <>{children}</>
}

