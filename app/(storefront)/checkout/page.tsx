import { Suspense } from 'react'
import CheckoutClient from './CheckoutClient'
import { getServerSession, getSiteSettings } from '@/lib/loaders'
import { createServerSupabase } from '@/lib/supabase/server'
import type { UserAddress } from '@/hooks/useAddresses'
import type { Database } from '@/supabase/database.types'

type AddressRow = Database["public"]["Tables"]["customer_addresses"]["Row"]
type ProfileContact = Pick<Database["public"]["Tables"]["profiles"]["Row"], "full_name" | "phone">

export default async function CheckoutPage() {
    const session = await getServerSession()
    const isLoggedIn = !!session.userId

    let initialAddresses: UserAddress[] = []
    let initialProfile: { full_name: string | null; phone: string | null } | null = null
    const siteSettings = await getSiteSettings()

    const supabase = await createServerSupabase()

    if (session.userId) {
        // Fetch saved addresses server-side (bypasses browser auth timing + RLS)
        const { data: addressData } = await supabase
            .from('customer_addresses')
            .select('*')
            .eq('user_id', session.userId)
            .order('is_default', { ascending: false })
            .order('created_at', { ascending: false })

        if (addressData) {
            // Deduplicate by street+city+pincode (keep newest)
            const seen = new Set<string>()
            initialAddresses = (addressData as AddressRow[])
                .map((addr) => ({
                    ...addr,
                    is_default: addr.is_default ?? false,
                }))
                .filter(addr => {
                const key = `${addr.street.toLowerCase().trim()}|${addr.city.toLowerCase().trim()}|${addr.pincode.toLowerCase().trim()}`
                if (seen.has(key)) return false
                seen.add(key)
                return true
            })
        }

        // Fetch profile for billing pre-fill
        const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, phone')
            .eq('id', session.userId)
            .single()

        if (profileData) {
            const typedProfile = profileData as ProfileContact
            initialProfile = {
                full_name: typedProfile.full_name ?? null,
                phone: typedProfile.phone ?? null,
            }
        }
    }

    return (
        <main className="bg-background min-h-screen">
            <div className="container mx-auto max-w-[1400px] px-4 py-12">
                <Suspense fallback={null}>
                    <CheckoutClient
                        isLoggedIn={isLoggedIn}
                        userRole={session.userRole as "customer" | "sales" | "admin"}
                        initialAddresses={initialAddresses}
                        initialProfile={initialProfile}
                        userId={session.userId ?? null}
                        siteSettings={siteSettings}
                    />
                </Suspense>
            </div>
        </main>
    )
}
