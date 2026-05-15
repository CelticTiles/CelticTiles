import CartClient from './CartClient'
import { getCartForUser } from '@/lib/cart/server'
import { getSiteSettings } from '@/lib/loaders'

export default async function CartPage() {
    const [{ cart, isLoggedIn }, siteSettings] = await Promise.all([
        getCartForUser(),
        getSiteSettings(),
    ])

    return (
        <>
            <main className="bg-background min-h-screen">
                <div className="container mx-auto max-w-[1400px] px-4 py-12">
                    <CartClient initialCart={cart} isLoggedIn={isLoggedIn} siteSettings={siteSettings} />
                </div>
            </main>
        </>
    )
}
