"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { User, Package, Heart, MapPin, CreditCard, Bell, LogOut } from "lucide-react"
import { useStore } from "@/hooks/useStore"
import { cn } from "@/lib/utils"
import { logoutOrchestrator } from "@/lib/logout-orchestrator"

export function AccountSidebar() {
    const pathname = usePathname()
    const { logout } = useStore()

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
        { name: "Payment Methods", href: "/account/payment-methods", icon: CreditCard },
        { name: "Notifications", href: "/account/notifications", icon: Bell },
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
                        <item.icon className={cn("h-5 w-5 transition-colors", isActive ? "text-primary" : "text-slate-400 group-hover:text-primary")} />
                        <span>{item.name}</span>
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
