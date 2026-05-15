"use client"

import Link from "next/link"
import Image from "next/image"
import { 
  User, 
  LogOut, 
  ChevronDown,
  ShieldCheck,
  Home
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState, useRef, useEffect } from "react"
import { useStore } from "@/hooks/useStore"
import type { ServerSession } from "@/lib/loaders"
import { logoutOrchestrator } from "@/lib/logout-orchestrator"

// Role badge component
function RoleBadge({ role }: { role: string }) {
  const roleConfig = {
    admin: { label: "Admin", className: "bg-purple-100 text-purple-700" },
    sales: { label: "Sales", className: "bg-green-100 text-green-700" },
    inventory: { label: "Inventory", className: "bg-amber-100 text-amber-700" },
    customer: { label: "", className: "" },
  }
  
  const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.customer
  
  if (!config.label) return null
  
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${config.className}`}>
      {config.label}
    </span>
  )
}

export interface AdminHeaderProps {
  session?: ServerSession | null
}

export function AdminHeader({ session }: AdminHeaderProps) {
  const { logout } = useStore()
  
  const user = session?.userId ? {
    id: session.userId,
    name: session.userName || 'Admin',
    email: session.userEmail || '',
    role: session.userRole
  } : null
  
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleLogout = async () => {
    setIsProfileOpen(false)

    await logoutOrchestrator({
      redirectTo: "/",
      setLoggedOutCookie: true,
      runStoreLogout: logout,
    })
  }

  return (
    <header className="hidden lg:block sticky top-0 z-50 w-full border-b border-border bg-gray-50 shadow-sm">
      <div className="w-full px-4 sm:px-5 lg:px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo - Links to admin dashboard */}
          <Link
            href="/admin/dashboard"
            className="flex items-center space-x-3 group flex-shrink-0"
          >
            <Image
              src="/images/celticlogo.png"
              alt="Celtic Tiles Logo"
              width={200}
              height={60}
              className="h-10 xl:h-12 w-auto"
              priority
            />
            <span className="hidden sm:inline-block text-sm font-semibold text-primary border-l border-gray-300 pl-3 ml-1">
              Admin Portal
            </span>
          </Link>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            {/* Back to Store Button */}
            <Button
              variant="outline"
              size="sm"
              asChild
              className="hidden sm:flex"
            >
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                View Store
              </Link>
            </Button>

            {/* Account Dropdown */}
            {user && (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 text-foreground hover:text-primary transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 transition-transform group-hover:scale-110" />
                    <div className="hidden sm:flex flex-col items-start">
                      <span className="text-xs font-medium">{user.name.split(" ")[0]}</span>
                      <RoleBadge role={user.role} />
                    </div>
                  </div>
                  <ChevronDown className={`h-4 w-4 hidden sm:block transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Profile Dropdown */}
                {isProfileOpen && (
                  <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-xl border border-gray-200/60 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* User Info */}
                    <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                      <p className="font-semibold text-sm text-foreground">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
                    </div>

                    {/* View Store - mobile only (hidden on sm+) */}
                    <div className="sm:hidden">
                      <Link
                        href="/"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-gray-50 transition-colors"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <Home className="h-4 w-4 text-muted-foreground" />
                        View Store
                      </Link>
                    </div>

                    {/* Logout */}
                    <div className="p-2">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-all duration-150 cursor-pointer"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
