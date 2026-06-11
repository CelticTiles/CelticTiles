"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { User, Package, Heart, MapPin, Bell, LogOut } from "lucide-react"
import { useStore } from "@/hooks/useStore"
import { cn } from "@/lib/utils"
import { logoutOrchestrator } from "@/lib/logout-orchestrator"
import { useEffect, useState } from "react"

interface AccountSidebarProps {
    notificationCount?: number
    userId?: string
}

function getStorageKey(userId: string) {
    return `notifications_read_${userId}`
}

function getReadSet(userId: string): Set<string> {
    try {
        const raw = localStorage.getItem(getStorageKey(userId))
        if (!raw) return new Set()
        return new Set(JSON.parse(raw))
    } catch {
        return new Set()
    }
}

export function AccountSidebar({ notificationCount = 0, userId }: AccountSidebarProps) {
    const pathname = usePathname()
    const { logout } = useStore()
    const [unreadCount, setUnreadCount] = useState(0)

    // Compute unread count from localStorage
    useEffect(() => {
        if (!userId || notificationCount === 0) {
            setUnreadCount(0)
            return
        }
        const readSet = getReadSet(userId)
        // We don't have keys client-side here, so we track the last-seen total count
        const lastSeen = parseInt(localStorage.getItem(`${getStorageKey(userId)}_total`) || "0", 10)
        setUnreadCount(Math.max(0, notificationCount - lastSeen))
    }, [notificationCount, userId])

    // Listen for mark-all-read events dispatched from NotificationsClient
    useEffect(() => {
        if (!userId) return
        const handler = () => {
            // After mark-as-read, store the total so badge goes to 0
            localStorage.setItem(`${getStorageKey(userId)}_total`, String(notificationCount))
            setUnreadCount(0)
        }
        window.addEventListener("notifications-read", handler)
        return () => window.removeEventListener("notifications-read", handler)
    }, [userId, notificationCount])

    const handleLogout = async () => {
        await logoutOrchestrator({
            redirectTo: "/",
            setLoggedOutCookie: true,
            runStoreLogout: logout,
        })
    }

    const navItems = [
        { name: "Dashboard", href: "/account", icon: User },
        { name: "My Orders", href: "/account/orders", icon: Package },
        { name: "Wishlist", href: "/wishlist", icon: Heart },
        { name: "Addresses", href: "/account/addresses", icon: MapPin },
        { name: "Notifications", href: "/account/notifications", icon: Bell, badge: unreadCount },
    ]

    return (
        <nav className="space-y-4">
            {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                    <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                            "flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 group font-bold text-sm transform hover:scale-[1.02] active:scale-[0.98]",
                            isActive
                                ? "neu-inset bg-[#E5E9F0] text-primary"
                                : "text-slate-600 hover:text-primary hover:bg-white/40"
                        )}
                    >
                        <item.icon className={cn("h-5 w-5 transition-colors flex-shrink-0", isActive ? "text-primary" : "text-slate-400 group-hover:text-primary")} />
                        <span className="flex-1">{item.name}</span>
                        {item.badge != null && item.badge > 0 && (
                            <span className="h-5 min-w-5 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center px-1.5 flex-shrink-0">
                                {item.badge > 99 ? "99+" : item.badge}
                            </span>
                        )}
                    </Link>
                )
            })}
            <div className="h-px bg-white/30 my-6 mx-2" />
            <button
                className="flex items-center gap-4 px-5 py-4 rounded-2xl text-tm-red hover:bg-red-50/50 transition-all w-full text-left font-bold text-sm group transform hover:scale-[1.02] active:scale-[0.98]"
                onClick={handleLogout}
            >
                <LogOut className="h-5 w-5 text-tm-red" />
                <span>Logout</span>
            </button>
        </nav>
    )
}
