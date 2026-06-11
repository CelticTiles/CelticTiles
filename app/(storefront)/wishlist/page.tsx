import { createServerSupabase } from "@/lib/supabase/server"
import { getServerSession } from "@/lib/loaders"
import { Button } from "@/components/ui/button"
import { Heart } from "lucide-react"
import Link from "next/link"
import { AccountSidebar } from "@/components/account/AccountSidebar"
import { Card, CardContent } from "@/components/ui/card"
import WishlistClient, { WishlistProduct } from "./WishlistClient"
export default async function WishlistPage() {
    // SERVER-SIDE: Single source of truth for session
    const session = await getServerSession()
    
    // Not logged in - show login CTA immediately (no flicker)
    if (!session.userId) {
        return (
            <>
                <main className="bg-background min-h-screen">
                    <div className="container mx-auto max-w-[1400px] px-4 py-12">
                        <div className="mb-8 border-b border-border pb-4">
                            <h1 className="text-3xl font-serif font-bold text-primary mb-2">My Wishlist</h1>
                            <p className="text-muted-foreground">0 items saved</p>
                        </div>
                        
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mb-6">
                                <Heart className="h-10 w-10 text-primary/50" />
                            </div>
                            <h2 className="text-xl font-semibold text-foreground mb-2">Please login to view your wishlist</h2>
                            <p className="text-muted-foreground mb-8 max-w-sm">
                                You need to be logged in to save items to your wishlist.
                            </p>
                            <Button className="bg-primary text-white hover:bg-primary/90" size="lg" asChild>
                                <Link href="/login">Login</Link>
                            </Button>
                        </div>
                    </div>
                </main>
            </>
        )
    }
    

    const supabase = await createServerSupabase()
    const { data: wishlistItems } = await supabase
        .from('wishlist_items')
        .select('product_id')
        .eq('user_id', session.userId)
        .order('created_at', { ascending: false })
    
    const typedWishlistItems = wishlistItems as { product_id: string }[] | null
    
    // Get product details for wishlist items
let wishlistProducts: WishlistProduct[] = []

if (typedWishlistItems && typedWishlistItems.length > 0) {
    const productIds = typedWishlistItems.map(item => item.product_id)

    const { data: products } = await supabase
    .from('products')
    .select('id, name, slug, subtitle, price, image')
    .in('id', productIds)

    const typedProducts: WishlistProduct[] = (products as any) ?? []

    // Maintain wishlist order
    wishlistProducts = productIds
        .map(id => typedProducts.find(p => p.id === id))
        .filter((p): p is WishlistProduct => p !== undefined)
    }

    
    return (
        <>
            <main className="bg-tm-bg-muted min-h-screen">
                <div className="container mx-auto max-w-[1400px] px-4 py-12">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-tm-text mb-2">My Wishlist</h1>
                        <p className="text-tm-text-muted">{wishlistProducts.length} items saved</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <div className="lg:col-span-1">
                            <Card>
                                <CardContent className="p-4">
                                    <AccountSidebar />
                                </CardContent>
                            </Card>
                        </div>
                        <div className="lg:col-span-3">
                            <WishlistClient 
                                initialProducts={wishlistProducts} 
                                userId={session.userId!} 
                            />
                        </div>
                    </div>
                </div>
            </main>
        </>
    )
}

