"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { 
  Search, 
  User, 
  Heart, 
  ShoppingCart, 
  Menu, 
  LogOut, 
  Package, 
  LayoutDashboard,
  Store,
  BarChart3,
  Ticket,
  Star,
  Users,
  ChevronDown,
  ShieldCheck,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SaveDimensionsModal } from "@/components/modals/save-dimensions-modal";
import { useState, useRef, useEffect } from "react";
import { MainNav } from "./main-nav";
import type { CategoryWithChildren } from "@/lib/loaders";
import type { Product } from "@/lib/supabase-types";

import { useStore } from "@/hooks/useStore";
import { logoutOrchestrator } from "@/lib/logout-orchestrator";

import { toast } from "sonner";
import type { ServerSession } from "@/lib/loaders";

// Lazy load SearchAutocomplete for performance
const SearchAutocomplete = dynamic(
  () => import("@/components/search/search-autocomplete").then(m => ({ default: m.SearchAutocomplete })),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-12 bg-gray-100 rounded-md animate-pulse" />
    )
  }
);

// Role badge component
function RoleBadge({ role }: { role: string }) {
  const roleConfig = {
    admin: { label: "Admin", className: "bg-purple-100 text-purple-700" },
    sales: { label: "Sales", className: "bg-green-100 text-green-700" },
    customer: { label: "", className: "" },
  };
  
  const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.customer;
  
  if (!config.label) return null;
  
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${config.className}`}>
      {config.label}
    </span>
  );
}

export interface SiteHeaderProps {
  session?: ServerSession | null;
  initialCartCount?: number;
  initialWishlistCount?: number;
  categories?: CategoryWithChildren[];
  products?: Product[];
}

export function SiteHeader({ 
  session,
  initialCartCount = 0, 
  initialWishlistCount = 0,
  categories = [],
  products = []
}: SiteHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const logout = useStore((state) => state.logout);
  const hasHydrated = useStore((state) => state._hasHydrated);
  const wishlistCountState = useStore((state) => state.wishlist.length);

  
  // Use server-provided session for auth (single source of truth)
  const user = session?.userId ? {
    id: session.userId,
    name: session.userName || 'User',
    email: session.userEmail || '',
    role: session.userRole
  } : null;
  
  const isAdmin = () => user?.role === 'admin';
  const isSales = () => user?.role === 'sales';
  const isInventory = () => user?.role === 'inventory';
  const canAccessDashboard = () => user?.role === 'admin' || user?.role === 'sales' || user?.role === 'inventory';
  
  // ✅ Use reactive subscription to cart count from Zustand store
  const cartCount = useStore((state) => state.cartCount);
  const wishlistCount = hasHydrated ? wishlistCountState : initialWishlistCount;
  
  const [isDimensionsModalOpen, setIsDimensionsModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close profile dropdown on route changes to prevent stale open state after navigation.
  useEffect(() => {
    setIsProfileOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setIsProfileOpen(false);

    await logoutOrchestrator({
      redirectTo: "/",
      setLoggedOutCookie: true,
      runStoreLogout: logout,
    });
  };

  return (
    <>
      {/* Top Bar - Original High-Contrast Promo Bar */}
      <div className="bg-tm-red text-white py-2 px-4 text-center z-[60] relative overflow-hidden">
        <div className="container mx-auto max-w-[1400px] flex items-center justify-center gap-6 text-[10px] md:text-xs font-bold uppercase tracking-widest whitespace-nowrap overflow-hidden">
          <span className="flex items-center gap-2">
            <Package className="h-3 w-3" />
            Free Delivery on orders over €1000
          </span>
          <span className="hidden md:inline-block h-3 w-px bg-white/30" />
          <a
            href="https://www.google.com/maps/place/Celtic+Tiles/@53.3240536,-6.3380458,17z/data=!3m1!4b1!4m6!3m5!1s0x4867133caf418fc7:0x8584650c497326da!8m2!3d53.3240536!4d-6.3380458!16s%2Fg%2F11c5q8y8qy"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-white/80 transition-colors"
          >
            <Store className="h-3 w-3" />
            Visit our Dublin Showroom
          </a>
          <Link href="/contact" className="hidden sm:flex items-center gap-2 hover:text-white/80 transition-colors underline underline-offset-4">
            Get in touch
          </Link>
        </div>
      </div>

      <header className="sticky top-0 z-50 w-full transition-all duration-300">
        {/* Main Header Area */}
        <div className="bg-[#E5E9F0] border-b border-white/20 shadow-sm">
          <div className="container mx-auto max-w-[1400px] px-4 md:px-8">
            <div className="flex h-16 md:h-20 lg:h-24 items-center justify-between gap-6 md:gap-10">
              {/* Logo */}
              <Link
                href="/"
                className="flex items-center group flex-shrink-0"
              >
                <div className="relative h-10 md:h-14 lg:h-16 w-32 md:w-48 lg:w-56 transition-transform group-hover:scale-105">
                  <Image
                    src="/images/celticlogo.png"
                    alt="Celtic Tiles Logo"
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 128px, (max-width: 1024px) 192px, 224px"
                    priority
                  />
                </div>
              </Link>

              {/* Search Bar - Desktop */}
              <div className="hidden md:block flex-1 max-w-2xl mx-4">
                <div className="relative neu-inset rounded-full bg-white/40 p-1">
                  <SearchAutocomplete
                    onSearch={(query) => router.push(`/search?q=${query}`)}
                  />
                </div>
              </div>

              {/* Action Icons */}
              <div className="flex items-center gap-2 md:gap-4">
                {/* Account Button */}
                <div className="relative" ref={profileRef}>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => user ? setIsProfileOpen(!isProfileOpen) : router.push('/login')}
                    className="h-10 w-10 md:h-12 md:w-12 rounded-full neu-raised hover:neu-inset bg-[#E5E9F0] text-slate-700 hover:text-primary transition-all group"
                  >
                    {user?.role === 'admin' || user?.role === 'sales' ? (
                      <ShieldCheck className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                    ) : (
                      <User className="h-5 w-5 md:h-6 md:w-6" />
                    )}
                  </Button>
                  
                  {/* Dropdown Menu */}
                  {isProfileOpen && user && (
                    <div className="absolute right-0 mt-4 w-64 bg-[#E5E9F0] rounded-[1.5rem] py-2 z-50 animate-in fade-in slide-in-from-top-2 overflow-hidden" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)' }}>
                      <div className="px-5 py-3 border-b border-white/20 bg-white/20">
                        <p className="font-bold text-sm text-slate-900">{user.name}</p>
                        <p className="text-[10px] text-slate-500 truncate font-medium uppercase tracking-wider">{user.role}</p>
                      </div>
                      <div className="py-2">
                        {canAccessDashboard() && (
                          <Link href="/admin/dashboard" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-5 py-2 hover:bg-white/40 transition-colors text-sm text-slate-700 font-bold">
                            <LayoutDashboard className="h-4 w-4 text-primary" /> Dashboard
                          </Link>
                        )}
                        {!canAccessDashboard() && (
                          <>
                            <Link href="/account" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-5 py-2 hover:bg-white/40 transition-colors text-sm text-slate-700">
                              <User className="h-4 w-4" /> My Profile
                            </Link>
                            <Link href="/account/orders" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-5 py-2 hover:bg-white/40 transition-colors text-sm text-slate-700">
                              <Package className="h-4 w-4" /> My Orders
                            </Link>
                          </>
                        )}
                        <div className="h-px bg-white/20 my-1 mx-4" />
                        <button 
                          onClick={handleLogout} 
                          disabled={isLoggingOut}
                          className="flex items-center gap-3 w-full px-5 py-2 hover:bg-red-50 text-red-600 transition-colors text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoggingOut ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <LogOut className="h-4 w-4" />
                          )}
                          {isLoggingOut ? "Logging out..." : "Logout"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Wishlist Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 md:h-12 md:w-12 rounded-full neu-raised hover:neu-inset bg-[#E5E9F0] text-slate-700 hover:text-red-500 transition-all relative group"
                  onClick={() => router.push('/wishlist')}
                >
                  <Heart className="h-5 w-5 md:h-6 md:w-6" />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 md:h-5 md:w-5 rounded-full bg-red-600 text-[10px] font-bold text-white flex items-center justify-center shadow-md animate-in zoom-in">
                      {wishlistCount}
                    </span>
                  )}
                </Button>

                {/* Cart Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 md:h-12 md:w-12 rounded-full neu-raised hover:neu-inset bg-[#E5E9F0] text-slate-700 hover:text-primary transition-all relative group"
                  onClick={() => router.push('/cart')}
                >
                  <ShoppingCart className="h-5 w-5 md:h-6 md:w-6" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 md:h-5 md:w-5 rounded-full bg-primary text-[10px] font-bold text-white flex items-center justify-center shadow-md animate-in zoom-in">
                      {cartCount}
                    </span>
                  )}
                </Button>

                {/* Mobile Menu Toggle */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 md:hidden rounded-full neu-raised bg-[#E5E9F0]"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>


        {/* Mobile Search - Slide down or integrated */}
        <div className="md:hidden bg-[#E5E9F0] px-4 py-3 border-b border-white/20">
          <div className="relative neu-inset rounded-full bg-white/40 p-1">
            <SearchAutocomplete
              onSearch={(query) => router.push(`/search?q=${query}`)}
            />
          </div>
        </div>


        {/* Categories / MainNav - Desktop only */}
        <div className="bg-[#E5E9F0] border-b border-white/10 hidden md:block">
          <div className="container mx-auto max-w-[1400px]">
            <MainNav categories={categories} products={products} />
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/50 z-[60] md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            
            {/* Drawer */}
            <div className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-[#E5E9F0] z-[70] md:hidden overflow-y-auto animate-in slide-in-from-right duration-300">
              <div className="p-6">
                {/* Close Button */}
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="absolute top-4 right-4 h-10 w-10 rounded-full neu-raised bg-[#E5E9F0] flex items-center justify-center text-slate-700 hover:text-primary"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* User Section */}
                {user ? (
                  <div className="mb-8 p-4 rounded-2xl neu-inset bg-[#E5E9F0]">
                    <p className="font-bold text-slate-800 mb-1">{user.name}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>
                ) : (
                  <div className="mb-8">
                    <Link 
                      href="/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block w-full py-3 px-6 rounded-full bg-primary text-white text-center font-bold"
                    >
                      Sign In
                    </Link>
                  </div>
                )}

                {/* Categories */}
                <div className="mb-8">
                  <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-4">Shop</h3>
                  <nav className="space-y-2">
                    {categories.map((category) => (
                      <Link
                        key={category.id}
                        href={`/${category.slug}`}
                        prefetch={false}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block px-4 py-3 rounded-xl text-slate-700 font-bold hover:bg-white/40 transition-colors"
                      >
                        {category.name}
                      </Link>
                    ))}
                  </nav>
                </div>

                {/* Account Links */}
                {user && (
                  <div className="mb-8">
                    <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-4">Account</h3>
                    <nav className="space-y-2">
                      {!canAccessDashboard() && (
                        <>
                          <Link
                            href="/account"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 font-bold hover:bg-white/40 transition-colors"
                          >
                            <User className="h-5 w-5" />
                            My Profile
                          </Link>
                          <Link
                            href="/account/orders"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 font-bold hover:bg-white/40 transition-colors"
                          >
                            <Package className="h-5 w-5" />
                            My Orders
                          </Link>
                        </>
                      )}
                      <Link
                        href="/wishlist"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 font-bold hover:bg-white/40 transition-colors"
                      >
                        <Heart className="h-5 w-5" />
                        Wishlist
                      </Link>
                      {canAccessDashboard() && (
                        <Link
                          href="/admin/dashboard"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-primary font-bold hover:bg-white/40 transition-colors"
                        >
                          <LayoutDashboard className="h-5 w-5" />
                          Dashboard
                        </Link>
                      )}
                    </nav>
                  </div>
                )}

                {/* Logout */}
                {user && (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogout();
                    }}
                    disabled={isLoggingOut}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 font-bold hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoggingOut ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <LogOut className="h-5 w-5" />
                    )}
                    {isLoggingOut ? "Logging out..." : "Logout"}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </header>
    </>
  );
}

