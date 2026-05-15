"use client"

import { useState } from "react"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Plus, Trash2, MapPin, CheckCircle2, ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { useAddresses, UserAddress } from "@/hooks/useAddresses"
import type { ServerSession } from "@/lib/loaders"
import { toast } from "sonner"

interface AddressesClientProps {
    session: ServerSession
}

export default function AddressesClient({ session }: AddressesClientProps) {
    const { addresses, isLoading, addAddress, deleteAddress } = useAddresses(session.userId)
    const [showAddForm, setShowAddForm] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    

    const [newAddress, setNewAddress] = useState<Omit<UserAddress, "id" | "user_id" | "is_default" | "created_at" | "updated_at">>({
        full_name: "",
        label: "",
        street: "",
        city: "",
        state: "",
        pincode: "",
        country: "Ireland",
        phone: "",
    })

    const handleAddAddress = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        try {
            await addAddress({ ...newAddress, is_default: addresses.length === 0 })
            toast.success("Address saved successfully!")
            setShowAddForm(false)
            setNewAddress({
                full_name: "",
                label: "",
                street: "",
                city: "",
                state: "",
                pincode: "",
                country: "Ireland",
                phone: "",
            })
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to add address"
            toast.error(errorMessage)
            console.error("Address save error:", err)
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2].map((i) => (
                    <div key={i} className="h-40 bg-white shadow-inner animate-pulse rounded-2xl" />
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-6 bg-[#E5E9F0] min-h-screen p-1">
            <div className="flex items-center justify-between mb-6">
                <Button variant="ghost" size="sm" asChild className="text-slate-500 hover:text-primary pl-0">
                    <Link href="/account">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Dashboard
                    </Link>
                </Button>
                <Button 
                    onClick={() => setShowAddForm(!showAddForm)} 
                    className={`rounded-full shadow-lg ${showAddForm ? 'bg-slate-200 text-slate-700' : 'bg-primary text-white hover:bg-primary-dark'}`}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    {showAddForm ? "Cancel" : "Add New Address"}
                </Button>
            </div>

            {showAddForm && (
                <Card className="mb-8 border-none neu-raised bg-[#E5E9F0] rounded-[2rem]">
                    <CardHeader>
                        <CardTitle className="text-xl font-serif font-bold text-slate-800">Add New Address</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddAddress} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                placeholder="Full Name"
                                value={newAddress.full_name}
                                onChange={(e) => setNewAddress({ ...newAddress, full_name: e.target.value })}
                                required
                                className="bg-transparent neu-inset border-none h-12 rounded-xl focus-visible:ring-1 focus-visible:ring-primary/20"
                            />
                            <Input
                                placeholder="Phone"
                                value={newAddress.phone}
                                onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                                required
                                className="bg-transparent neu-inset border-none h-12 rounded-xl focus-visible:ring-1 focus-visible:ring-primary/20"
                            />
                            <Input
                                placeholder="Street Address"
                                className="md:col-span-2 bg-transparent neu-inset border-none h-12 rounded-xl focus-visible:ring-1 focus-visible:ring-primary/20"
                                value={newAddress.street}
                                onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                                required
                            />
                            <Input
                                placeholder="Label (e.g. Home, Office - Optional)"
                                className="md:col-span-2 bg-transparent neu-inset border-none h-12 rounded-xl focus-visible:ring-1 focus-visible:ring-primary/20"
                                value={newAddress.label || ""}
                                onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                            />
                            <Input
                                placeholder="City"
                                value={newAddress.city}
                                onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                                required
                                className="bg-transparent neu-inset border-none h-12 rounded-xl focus-visible:ring-1 focus-visible:ring-primary/20"
                            />
                            <Input
                                placeholder="County / State"
                                value={newAddress.state}
                                onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                                required
                                className="bg-transparent neu-inset border-none h-12 rounded-xl focus-visible:ring-1 focus-visible:ring-primary/20"
                            />
                            <Input
                                placeholder="Postcode / Pincode"
                                value={newAddress.pincode}
                                onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value })}
                                required
                                className="bg-transparent neu-inset border-none h-12 rounded-xl focus-visible:ring-1 focus-visible:ring-primary/20"
                            />
                            <Input
                                placeholder="Country"
                                value={newAddress.country || ""}
                                onChange={(e) => setNewAddress({ ...newAddress, country: e.target.value })}
                                className="bg-transparent neu-inset border-none h-12 rounded-xl focus-visible:ring-1 focus-visible:ring-primary/20"
                            />
                            <div className="md:col-span-2 pt-2">
                                <Button 
                                    type="submit" 
                                    disabled={isSaving}
                                    className="w-full h-12 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {isSaving ? "Saving..." : "Save Address"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {addresses.length === 0 ? (
                    <div className="md:col-span-2 text-center py-16 bg-transparent neu-inset rounded-[2rem]">
                        <MapPin className="h-12 w-12 mx-auto text-slate-300 mb-4 opacity-50" />
                        <p className="text-slate-500 text-lg font-medium">You haven&apos;t saved any addresses yet.</p>
                    </div>
                ) : (
                    addresses.map((address: UserAddress) => (
                        <Card key={address.id} className={`border-none rounded-[2rem] bg-[#E5E9F0] neu-raised transition-all hover:scale-[1.01] ${address.is_default ? 'ring-2 ring-primary/20' : ''}`}>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <div className="flex flex-col">
                                    <CardTitle className="text-lg font-serif font-bold flex items-center gap-2 text-slate-800">
                                        {address.is_default && <CheckCircle2 className="h-5 w-5 text-primary" />}
                                        {address.full_name}
                                    </CardTitle>
                                    {address.label && <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{address.label}</span>}
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-10 w-10 text-slate-400 hover:text-red-500 hover:bg-white/40 rounded-full"
                                        onClick={() => deleteAddress(address.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="text-slate-600 text-sm space-y-1 mt-2">
                                <p>{address.street}</p>
                                <p>{address.city}, {address.state}</p>
                                <p>{address.pincode}</p>
                                <p>{address.country}</p>
                                <p className="pt-4 font-bold text-slate-800">Phone: {address.phone}</p>
                            </CardContent>
                            {address.is_default && (
                                <CardFooter className="pt-0">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">Default Address</span>
                                </CardFooter>
                            )}
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
