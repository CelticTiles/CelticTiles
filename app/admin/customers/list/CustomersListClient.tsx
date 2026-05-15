"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Users, Search, Eye, UserX, Trash2, Pencil, Loader2 } from "lucide-react"
import { Pagination } from "@/components/admin/Pagination"
import { EmptyState } from "@/components/admin/EmptyState"
import { usePagination } from "@/hooks/usePagination"
import { formatPrice } from "@/lib/utils"
import type { CustomerData } from "./page"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog"

interface CustomersListClientProps {
  initialCustomers: CustomerData[]
}

export default function CustomersListClient({ initialCustomers }: CustomersListClientProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [customers] = useState(initialCustomers)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deactivateId, setDeactivateId] = useState<string | null>(null)
  const [editCustomer, setEditCustomer] = useState<CustomerData | null>(null)
  const [editName, setEditName] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone && c.phone.includes(searchTerm))
    )
  }, [searchTerm, customers])

  const {
    currentPage,
    totalPages,
    goToPage,
    startIndex,
    endIndex,
    itemsPerPage
  } = usePagination({
    totalItems: filteredCustomers.length,
    itemsPerPage: 10
  })

  // Reset page when search changes
  useEffect(() => {
    goToPage(1)
  }, [searchTerm, goToPage])

  const currentCustomers = filteredCustomers.slice(startIndex, endIndex)

  const handleDeactivate = async (id: string) => {
  try {
    await fetch("/api/admin/customers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active: false }),
    })

    router.refresh()
    setDeactivateId(null)
    toast.success("Customer deactivated")
  } catch (err: any) {
    toast.error("Failed to deactivate: " + err.message)
  }
}

const handleDelete = async (id: string) => {
  try {
    const res = await fetch("/api/admin/customers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })

    if (!res.ok) throw new Error("Delete failed")

    router.refresh()
    setDeleteId(null)
    toast.success("Customer deleted permanently")
  } catch (err: any) {
    toast.error("Failed to delete: " + err.message)
  }
}

  const openEdit = (customer: CustomerData) => {
    setEditCustomer(customer)
    setEditName(customer.name === 'Unknown' ? '' : customer.name)
    setEditPhone(customer.phone || '')
  }

  const handleEditSave = async () => {
    if (!editCustomer) return
    setIsSaving(true)
    try {
    const res = await fetch("/api/admin/customers", {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    id: editCustomer.id,
    full_name: editName,
    phone: editPhone,
  }),
})

if (!res.ok) throw new Error("Update failed")

router.refresh()
setEditCustomer(null)
toast.success("Customer updated")
    } catch (err: any) {
      toast.error('Failed to update: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-serif font-bold text-primary">Customers</h1>
              <p className="text-muted-foreground mt-1">Manage customer information</p>
            </div>
            
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Customers ({filteredCustomers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredCustomers.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No customers found"
                  description={searchTerm ? "Try adjusting your search terms." : "You haven't added any customers yet."}
                  actionLabel={searchTerm ? "Clear Search" : undefined}
                  onAction={() => setSearchTerm("")}
                />
              ) : (
                <>
                  <div className="space-y-3">
                    {currentCustomers.map((customer) => (
                      <div key={customer.id} className="flex items-center justify-between p-4 border border-border rounded-lg animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                            {customer.name[0]?.toUpperCase() || 'U'}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold">{customer.name}</p>
                            <p className="text-sm text-muted-foreground">{customer.email}</p>
                            <p className="text-xs text-muted-foreground sm:hidden">{customer.phone}</p>
                          </div>
                        </div>
                        <div className="text-right text-sm mr-4">
                          <p className="font-medium">{customer.totalOrders} orders</p>
                          <p className="text-muted-foreground">{formatPrice(customer.totalSpent)} spent</p>
                          <p className="text-xs text-muted-foreground hidden sm:block mt-1">Joined {new Date(customer.joinedAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/admin/customers/${customer.id}`}>
                              <Eye className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openEdit(customer)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setDeactivateId(customer.id)}>
                            <UserX className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setDeleteId(customer.id)} className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {totalPages > 1 && (
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={goToPage}
                      totalItems={filteredCustomers.length}
                      itemsPerPage={itemsPerPage}
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>

        {/* Edit Customer Dialog */}
        <Dialog open={!!editCustomer} onOpenChange={(open) => { if (!open) setEditCustomer(null) }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Customer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Customer full name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  value={editCustomer?.email || ''}
                  disabled
                  className="opacity-60"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+353 xx xxx xxxx"
                  type="tel"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditCustomer(null)} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleEditSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <DeleteConfirmDialog
          isOpen={!!deleteId}
          title="Delete Customer"
          description="Are you sure you want to permanently delete this customer? This action cannot be undone."
          itemName="customer"
          onConfirm={() => deleteId && handleDelete(deleteId)}
          onCancel={() => setDeleteId(null)}
        />

      <DeleteConfirmDialog
        isOpen={!!deactivateId}
        title="Deactivate Customer"
        description="Are you sure you want to deactivate this customer? They will not be able to log in."
        itemName="customer"
        onConfirm={() => deactivateId && handleDeactivate(deactivateId)}
        onCancel={() => setDeactivateId(null)}
      />
    </div>
  )
}
