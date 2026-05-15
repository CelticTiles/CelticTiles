import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { UserRole } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

// =============================================================================
// IMPORTANT: Cart is now managed by useCart hook (Supabase cart_items table)
// Do NOT add cart functionality back here. Use useCart hook instead.
// =============================================================================

interface User {
    id: string
    name: string
    email: string
    role: UserRole
}

interface StoreState {
    // Hydration
    _hasHydrated: boolean
    setHasHydrated: (state: boolean) => void

    // User
    user: User | null
    login: (id: string, name: string, email: string, role: UserRole) => void
    logout: () => Promise<void>
    
    // Role helpers
    isAdmin: () => boolean
    isSales: () => boolean
    canAccessDashboard: () => boolean

    // Wishlist (localStorage for quick toggle UI, synced to Supabase in useWishlist)
    wishlist: string[] // product IDs
    setWishlist: (productIds: string[]) => void // Sync from Supabase
    toggleWishlist: (productId: string) => void
    isInWishlist: (productId: string) => boolean

    // Cart
    cartCount: number
    setCartCount: (count: number) => void
    cartItems: Record<string, { cartItemId: string; quantity: number }>
    setCartItems: (items: Record<string, { cartItemId: string; quantity: number }>) => void
    getCartQuantity: (productId: string) => number
    getCartItemId: (productId: string) => string | null
}

export const useStore = create<StoreState>()(
    persist(
        (set, get) => ({
            // Hydration tracking
            _hasHydrated: false,
            setHasHydrated: (state) => set({ _hasHydrated: state }),

            // User
            user: null,
            login: (id, name, email, role) => set({ user: { id, name, email, role } }),
            logout: async () => {
                // ✅ IMPORTANT: Supabase.auth.signOut() is called in AdminHeader
                // This function just clears the Zustand state
                // Always clear local state
                set({ user: null, wishlist: [] })
                
                // ✅ CRITICAL: Clear localStorage to prevent credential persistence
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('celtic-tiles-storage')
                    sessionStorage.clear()
                }
            },
            
            // Role helpers
            isAdmin: () => get().user?.role === 'admin',
            isSales: () => get().user?.role === 'sales',
            canAccessDashboard: () => {
                const role = get().user?.role
                return role === 'admin' || role === 'sales' || role === 'inventory'
            },

            // Wishlist (for UI toggle - actual persistence in useWishlist hook)
            wishlist: [],
            setWishlist: (productIds) => set({ wishlist: productIds }), // Sync from Supabase
            toggleWishlist: (productId) => set((state) => {
                if (state.wishlist.includes(productId)) {
                    return { wishlist: state.wishlist.filter(id => id !== productId) }
                }
                return { wishlist: [...state.wishlist, productId] }
            }),
            isInWishlist: (productId) => get().wishlist.includes(productId),

            // Cart
            cartCount: 0,
            setCartCount: (count) => set({ cartCount: count }),
            cartItems: {},
            setCartItems: (items) => set({ cartItems: items }),
            getCartQuantity: (productId) => get().cartItems[productId]?.quantity || 0,
            getCartItemId: (productId) => get().cartItems[productId]?.cartItemId || null,
        }),
        {
            name: 'celtic-tiles-storage',
            onRehydrateStorage: () => (state) => {
                if (typeof window !== 'undefined') {
                    Promise.resolve().then(() => {
                        state?.setHasHydrated(true)
                    })
                } else {
                    state?.setHasHydrated(true)
                }
            },
        }
    )
)

export default useStore
