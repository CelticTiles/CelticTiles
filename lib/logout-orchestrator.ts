import { getSupabaseBrowserClient } from "@/lib/supabase/client"

interface LogoutOrchestratorOptions {
  redirectTo?: string
  setLoggedOutCookie?: boolean
  runStoreLogout?: () => Promise<void> | void
}

function reportAuthAudit(event: string, payload: Record<string, unknown>) {
  if (typeof window === "undefined") return

  fetch("/api/auth/audit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, ...payload }),
    keepalive: true,
  }).catch(() => {})
}

function clearSupabaseClientAuthArtifacts() {
  if (typeof window === "undefined") return

  const clearStorageByPrefix = (storage: Storage, prefixes: string[]) => {
    const keysToRemove: string[] = []
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i)
      if (!key) continue
      if (prefixes.some((prefix) => key.startsWith(prefix))) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => storage.removeItem(key))
  }

  clearStorageByPrefix(localStorage, ["sb-", "supabase."])
  clearStorageByPrefix(sessionStorage, ["sb-", "supabase."])

  // Clear Supabase SSR/browser cookies that keep session alive for server checks.
  const cookies = document.cookie.split(";")
  cookies.forEach((cookie) => {
    const [rawName] = cookie.trim().split("=")
    const name = rawName?.trim()
    if (!name) return
    if (name.startsWith("sb-") || name.startsWith("supabase-")) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
    }
  })
}

/**
 * Shared logout pipeline used across storefront/account/admin UIs.
 * Keeps sequence deterministic and avoids diverging logout behaviors.
 */
export async function logoutOrchestrator(options: LogoutOrchestratorOptions = {}) {
  const {
    redirectTo = "/login",
    setLoggedOutCookie = false,
    runStoreLogout,
  } = options

  reportAuthAudit("logout_start", {
    source: "logout_orchestrator",
    path: typeof window !== "undefined" ? window.location.pathname : "unknown",
  })

  try {
    const supabase = getSupabaseBrowserClient()

    // Do not let remote sign-out latency block local logout UX.
    await Promise.race([
      supabase.auth.signOut({ scope: "local" }),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ])
  } catch {
    // Continue with local cleanup even if remote sign-out fails.
  }

  try {
    await runStoreLogout?.()
  } catch {
    // Continue redirect to guarantee user exits protected areas.
  }

  if (typeof window !== "undefined") {
    clearSupabaseClientAuthArtifacts()
    localStorage.removeItem("celtic-tiles-storage")
    sessionStorage.clear()

    if (setLoggedOutCookie) {
      document.cookie = "logged_out=true; max-age=10; path=/"
    }

    reportAuthAudit("logout_redirect", {
      source: "logout_orchestrator",
      path: window.location.pathname,
      redirectTo,
    })

    window.location.href = redirectTo
  }
}
