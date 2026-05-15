"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { Package, Heart, Bell, Loader2 } from "lucide-react"
import { useStore } from "@/hooks/useStore"
import { useWishlist } from "@/hooks/useWishlist"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { formatPrice } from "@/lib/utils"
import { formatOrderDate } from "@/lib/order-utils"
import { StatusBadge } from "@/components/admin/StatusBadge"
import { toast } from "sonner"
import type { ServerSession } from "@/lib/loaders"
import type { Database } from "@/lib/supabase-types"

interface AccountClientProps {
    session: ServerSession
    initialFullName: string
    initialPhone: string
    orderCount: number
    recentOrders: Array<{
        id: string
        orderNumber: string
        order_number?: string
        status: string
        total: number
        createdAt?: string
        created_at?: string
    }>
}

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"]

function getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) return error.message
    return fallback
}

export default function AccountClient({ session, initialFullName, initialPhone, orderCount, recentOrders }: AccountClientProps) {
    const { logout } = useStore()
    const router = useRouter()
    const { wishlistItems, isLoading: wishlistLoading } = useWishlist()

    const [isEditing, setIsEditing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [fullName, setFullName] = useState(initialFullName)
    const [phone, setPhone] = useState(initialPhone)
    const [editFullName, setEditFullName] = useState(initialFullName)
    const [editPhone, setEditPhone] = useState(initialPhone)

    const handleEditSave = async () => {
        if (!session.userId) return
        setIsSaving(true)
        try {
            const supabase = getSupabaseBrowserClient()
            const profileUpdate: ProfileUpdate = {
                full_name: editFullName.trim() || null,
                phone: editPhone.trim() || null,
            }

            const { error } = await supabase
                .from('profiles')
                .update(profileUpdate)
                .eq('id', session.userId)

            if (error) throw error
            setFullName(editFullName)
            setPhone(editPhone)
            setIsEditing(false)
            toast.success('Profile updated successfully')
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, 'Failed to update profile'))
        } finally {
            setIsSaving(false)
        }
    }

    const handleEditCancel = () => {
        setEditFullName(fullName)
        setEditPhone(phone)
        setIsEditing(false)
    }


    const isLoading = wishlistLoading

    return (
        <div className="space-y-10">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                {/* Total Orders */}
                <Card className="border-none neu-raised bg-[#E5E9F0] rounded-[2rem] overflow-hidden transition-all hover:scale-[1.02]">
                    <CardHeader className="pb-2 px-8 pt-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                                <Package className="h-4 w-4 text-primary" />
                            </div>
                            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Orders</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="px-8 pb-8">
                        {isLoading ? (
                            <div className="h-10 w-24 bg-white/20 animate-pulse rounded-lg" />
                        ) : (
                            <p className="text-4xl font-bold text-slate-800">{orderCount}</p>
                        )}
                    </CardContent>
                </Card>

                {/* Wishlist Items */}
                <Card className="border-none neu-raised bg-[#E5E9F0] rounded-[2rem] overflow-hidden transition-all hover:scale-[1.02]">
                    <CardHeader className="pb-2 px-8 pt-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-red-500/10">
                                <Heart className="h-4 w-4 text-red-500" />
                            </div>
                            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">Wishlist Items</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="px-8 pb-8">
                        {wishlistLoading ? (
                            <div className="h-10 w-24 bg-white/20 animate-pulse rounded-lg" />
                        ) : (
                            <p className="text-4xl font-bold text-slate-800">{wishlistItems.length}</p>
                        )}
                    </CardContent>
                </Card>

            
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
                {/* Recent Orders */}
                <Card className="border-none neu-raised bg-[#E5E9F0] rounded-[2.5rem] overflow-hidden h-full">
                    <CardHeader className="px-8 pt-8 pb-6">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-xl font-bold text-slate-800">Recent Orders</CardTitle>
                            <Link href="/account/orders" className="text-xs font-bold text-tm-red hover:underline uppercase tracking-widest">
                                View All
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent className="px-8 pb-8">
                        {false ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="h-20 bg-white/20 animate-pulse rounded-2xl" />
                                ))}
                            </div>
                        ) : recentOrders.length > 0 ? (
                            <div className="space-y-4">
                                {recentOrders.map((order) => (
                                    <div key={order.id} className="flex items-center justify-between p-5 neu-inset bg-[#E5E9F0] rounded-2xl transition-transform hover:scale-[1.01]">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-full bg-white/40 flex items-center justify-center">
                                                <Package className="h-5 w-5 text-slate-400" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">#{order.orderNumber}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                    {formatOrderDate(order.createdAt || order.created_at || new Date().toISOString())}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-primary text-sm mb-1">{formatPrice(order.total)}</p>
                                            <StatusBadge status={order.status} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 neu-inset rounded-2xl bg-[#E5E9F0]/50">
                                <Package className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                                <p className="text-sm font-bold text-slate-500 mb-6 uppercase tracking-widest">No orders yet</p>
                                <Button asChild variant="outline" className="rounded-full px-8 neu-raised bg-[#E5E9F0] border-none text-primary font-bold">
                                    <Link href="/tiles">Start Shopping</Link>
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Account Information */}
                <Card className="border-none neu-raised bg-[#E5E9F0] rounded-[2.5rem] overflow-hidden h-full">
                    <CardHeader className="px-8 pt-8 pb-6">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-xl font-bold text-slate-800">Profile Details</CardTitle>
                            {!isEditing ? (
                                <Button
                                    variant="ghost" size="sm"
                                    className="h-8 px-4 rounded-full neu-raised hover:neu-inset bg-[#E5E9F0] text-primary font-bold text-[10px] uppercase tracking-widest"
                                    onClick={() => { setEditFullName(fullName); setEditPhone(phone); setIsEditing(true) }}
                                >
                                    Edit
                                </Button>
                            ) : (
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost" size="sm"
                                        className="h-8 px-4 rounded-full neu-raised bg-[#E5E9F0] text-slate-500 font-bold text-[10px] uppercase tracking-widest"
                                        onClick={handleEditCancel}
                                        disabled={isSaving}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="h-8 px-4 rounded-full bg-primary text-white font-bold text-[10px] uppercase tracking-widest"
                                        onClick={handleEditSave}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="px-8 pb-8">
                        <div className="space-y-6">
                            <div className="p-5 neu-inset bg-[#E5E9F0] rounded-2xl">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Full Name</p>
                                        {isEditing ? (
                                            <Input
                                                value={editFullName}
                                                onChange={e => setEditFullName(e.target.value)}
                                                className="h-9 rounded-lg neu-inset bg-[#E5E9F0] border-none focus-visible:ring-1 focus-visible:ring-primary/30 text-slate-800 font-bold text-sm"
                                                placeholder="Your full name"
                                            />
                                        ) : (
                                            <p className="font-bold text-slate-800">{fullName || <span className="text-slate-400 italic font-normal text-sm">Not provided</span>}</p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Email Address</p>
                                        <p className="font-bold text-slate-800 truncate">{session.userEmail}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Phone Number</p>
                                        {isEditing ? (
                                            <Input
                                                value={editPhone}
                                                onChange={e => setEditPhone(e.target.value)}
                                                className="h-9 rounded-lg neu-inset bg-[#E5E9F0] border-none focus-visible:ring-1 focus-visible:ring-primary/30 text-slate-800 font-bold text-sm"
                                                placeholder="+353 xx xxx xxxx"
                                                type="tel"
                                            />
                                        ) : (
                                            <p className={phone ? "font-bold text-slate-800" : "font-bold text-slate-400 italic text-sm"}>
                                                {phone || 'Not provided'}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Customer ID</p>
                                        <p className="font-bold text-slate-600 text-xs truncate">#{session.userId?.split('-')[0] || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-5 rounded-2xl bg-white/20 border border-white/10">
                                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Bell className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">Notifications</p>
                                    <p className="text-[11px] text-slate-500 font-medium">You have no new messages</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
