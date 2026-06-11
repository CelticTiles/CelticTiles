"use client"

import { useState } from "react"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Plus, Trash2, MapPin, CheckCircle2, Loader2, Pencil, Star } from "lucide-react"
import { useAddresses, UserAddress } from "@/hooks/useAddresses"
import type { ServerSession } from "@/lib/loaders"
import { toast } from "sonner"

interface AddressesClientProps {
    session: ServerSession
}

type AddressFormData = Omit<UserAddress, "id" | "user_id" | "is_default" | "created_at" | "updated_at">

const emptyForm: AddressFormData = {
    full_name: "",
    label: "",
    street: "",
    city: "",
    state: "",
    pincode: "",
    country: "Ireland",
    phone: "",
}

export default function AddressesClient({ session }: AddressesClientProps) {
    const { addresses, isLoading, addAddress, deleteAddress, setDefault, updateAddress } = useAddresses(session.userId)
    const [showAddForm, setShowAddForm] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [newAddress, setNewAddress] = useState<AddressFormData>(emptyForm)
    const [editForm, setEditForm] = useState<AddressFormData>(emptyForm)

    // ── Add ─────────────────────────────────────────────────────────────
    const handleAddAddress = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        try {
            await addAddress({ ...newAddress, is_default: addresses.length === 0 })
            toast.success("Address saved successfully!")
            setShowAddForm(false)
            setNewAddress(emptyForm)
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to add address")
        } finally {
            setIsSaving(false)
        }
    }

    // ── Edit ─────────────────────────────────────────────────────────────
    const startEdit = (address: UserAddress) => {
        setEditingId(address.id)
        setEditForm({
            full_name: address.full_name,
            label: address.label ?? "",
            street: address.street,
            city: address.city,
            state: address.state,
            pincode: address.pincode,
            country: address.country ?? "Ireland",
            phone: address.phone,
        })
    }

    const handleSaveEdit = async (id: string) => {
        setIsSaving(true)
        try {
            const existing = addresses.find(a => a.id === id)
            await updateAddress(id, { ...editForm, is_default: existing?.is_default ?? false })
            toast.success("Address updated!")
            setEditingId(null)
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to update address")
        } finally {
            setIsSaving(false)
        }
    }

    // ── Set Default ──────────────────────────────────────────────────────
    const handleSetDefault = async (id: string) => {
        try {
            await setDefault(id)
            toast.success("Default address updated!")
        } catch {
            toast.error("Failed to set default address")
        }
    }

    // ── Delete ───────────────────────────────────────────────────────────
    const handleDelete = async (id: string) => {
        try {
            await deleteAddress(id)
            toast.success("Address removed")
        } catch {
            toast.error("Failed to delete address")
        }
    }

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2].map((i) => (
                    <div key={i} className="h-44 bg-[#E5E9F0] neu-raised animate-pulse rounded-[2rem]" />
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header row */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">My Addresses</h2>
                    <p className="text-sm text-slate-500 mt-0.5">{addresses.length} saved address{addresses.length !== 1 ? "es" : ""}</p>
                </div>
                <Button
                    onClick={() => { setShowAddForm(!showAddForm); setEditingId(null) }}
                    className={`rounded-full shadow-lg transition-all ${showAddForm ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-primary text-white hover:bg-primary/90'}`}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    {showAddForm ? "Cancel" : "Add New Address"}
                </Button>
            </div>

            {/* Add form */}
            {showAddForm && (
                <Card className="border-none neu-raised bg-[#E5E9F0] rounded-[2rem]">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold text-slate-800">New Address</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddAddress} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <AddressFields data={newAddress} onChange={(field, val) => setNewAddress(p => ({ ...p, [field]: val }))} />
                            <div className="md:col-span-2 pt-2">
                                <Button
                                    type="submit"
                                    disabled={isSaving}
                                    className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold shadow-lg disabled:opacity-70 flex items-center justify-center gap-2"
                                >
                                    {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {isSaving ? "Saving..." : "Save Address"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Address list */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {addresses.length === 0 ? (
                    <div className="md:col-span-2 text-center py-16 neu-inset bg-[#E5E9F0] rounded-[2rem]">
                        <MapPin className="h-12 w-12 mx-auto text-slate-300 mb-4 opacity-50" />
                        <p className="text-slate-500 text-lg font-medium">No addresses saved yet.</p>
                        <p className="text-slate-400 text-sm mt-1">Add your first address to speed up checkout.</p>
                    </div>
                ) : (
                    addresses.map((address) => (
                        <Card
                            key={address.id}
                            className={`border-none rounded-[2rem] bg-[#E5E9F0] transition-all ${address.is_default ? 'neu-inset ring-2 ring-primary/30' : 'neu-raised hover:scale-[1.01]'}`}
                        >
                            {editingId === address.id ? (
                                /* ── Edit Mode ── */
                                <>
                                    <CardHeader>
                                        <CardTitle className="text-base font-bold text-slate-700">Edit Address</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <AddressFields data={editForm} onChange={(field, val) => setEditForm(p => ({ ...p, [field]: val }))} />
                                        </div>
                                        <div className="flex gap-3 mt-4">
                                            <Button
                                                onClick={() => handleSaveEdit(address.id)}
                                                disabled={isSaving}
                                                className="flex-1 h-10 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 flex items-center justify-center gap-2"
                                            >
                                                {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                                {isSaving ? "Saving..." : "Save Changes"}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                onClick={() => setEditingId(null)}
                                                className="flex-1 h-10 rounded-xl neu-raised bg-[#E5E9F0] text-slate-600 font-bold"
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </CardContent>
                                </>
                            ) : (
                                /* ── View Mode ── */
                                <>
                                    <CardHeader className="flex flex-row items-start justify-between pb-2">
                                        <div className="flex flex-col">
                                            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                                                {address.is_default && <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />}
                                                {address.full_name}
                                            </CardTitle>
                                            {address.label && (
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{address.label}</span>
                                            )}
                                        </div>
                                        <div className="flex gap-1 flex-shrink-0">
                                            {!address.is_default && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title="Set as default"
                                                    className="h-9 w-9 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-full"
                                                    onClick={() => handleSetDefault(address.id)}
                                                >
                                                    <Star className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                title="Edit"
                                                className="h-9 w-9 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-full"
                                                onClick={() => startEdit(address)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                title="Delete"
                                                className="h-9 w-9 text-slate-400 hover:text-red-500 hover:bg-red-50/50 rounded-full"
                                                onClick={() => handleDelete(address.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="text-slate-600 text-sm space-y-0.5 mt-1">
                                        <p className="font-medium">{address.street}</p>
                                        <p>{address.city}{address.state ? `, ${address.state}` : ""}</p>
                                        {address.pincode && <p>{address.pincode}</p>}
                                        {address.country && <p>{address.country}</p>}
                                        <p className="pt-3 font-bold text-slate-700 text-sm">📞 {address.phone}</p>
                                    </CardContent>
                                    {address.is_default && (
                                        <CardFooter className="pt-0 pb-5 px-6">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">
                                                ✓ Default Address
                                            </span>
                                        </CardFooter>
                                    )}
                                </>
                            )}
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}

// ── Shared form fields component ────────────────────────────────────────────
function AddressFields({
    data,
    onChange,
}: {
    data: AddressFormData
    onChange: (field: keyof AddressFormData, value: string) => void
}) {
    const cls = "bg-transparent neu-inset border-none h-12 rounded-xl focus-visible:ring-1 focus-visible:ring-primary/20 text-sm"
    return (
        <>
            <Input placeholder="Full Name *" value={data.full_name} onChange={e => onChange("full_name", e.target.value)} required className={cls} />
            <Input placeholder="Phone *" value={data.phone} onChange={e => onChange("phone", e.target.value)} required className={cls} />
            <Input placeholder="Street Address *" className={`md:col-span-2 ${cls}`} value={data.street} onChange={e => onChange("street", e.target.value)} required />
            <Input placeholder="Label (e.g. Home, Office – Optional)" className={`md:col-span-2 ${cls}`} value={data.label ?? ""} onChange={e => onChange("label", e.target.value)} />
            <Input placeholder="City *" value={data.city} onChange={e => onChange("city", e.target.value)} required className={cls} />
            <Input placeholder="County *" value={data.state} onChange={e => onChange("state", e.target.value)} required className={cls} />
            <Input placeholder="Eircode / Postcode *" value={data.pincode} onChange={e => onChange("pincode", e.target.value)} required className={cls} />
            <Input placeholder="Country" value={data.country ?? ""} onChange={e => onChange("country", e.target.value)} className={cls} />
        </>
    )
}
