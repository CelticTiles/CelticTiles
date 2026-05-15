"use client"

import { useState } from "react"
import { toast } from "sonner"
import { useCoupons } from "@/hooks/useCoupons"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CouponDialog, type CouponFormData } from "@/components/admin/CouponDialog"
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog"
import { formatPrice } from "@/lib/utils"
import { Plus, Tag } from "lucide-react"

type EditingCoupon = {
  id: string
} & Partial<CouponFormData>

export default function CouponsPage() {
  const { coupons, addCoupon, updateCoupon, deleteCoupon } = useCoupons()

  const [isCreating, setIsCreating] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<EditingCoupon | null>(null)
  const [deletingCoupon, setDeletingCoupon] = useState<EditingCoupon | null>(null)

  const handleCreate = (data: CouponFormData) => {
    addCoupon(data)
    toast.success(`Coupon "${data.code}" created`, {
      description:
        data.discount_type === "percentage"
          ? `${data.discount_value}% off`
          : `${formatPrice(data.discount_value)} off`,
    })
    setIsCreating(false)
  }

  const handleEdit = (data: Partial<CouponFormData>) => {
    if (!editingCoupon) return
    updateCoupon(editingCoupon.id, data)
    toast.success(`Coupon "${data.code ?? editingCoupon.code}" updated`)
    setEditingCoupon(null)
  }

  const handleDelete = () => {
    if (!deletingCoupon) return
    deleteCoupon(deletingCoupon.id)
    toast.error(`Coupon "${deletingCoupon.code}" deleted`)
    setDeletingCoupon(null)
  }

  return (
    <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-serif font-bold text-primary">
                Coupons & Discounts
              </h1>
              <p className="text-muted-foreground mt-1">
                Create and manage discount codes
              </p>
            </div>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Coupon
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Coupons ({coupons.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {coupons.map((coupon) => (
                  <div
                    key={coupon.id}
                    className="border border-border rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <Tag className="w-5 h-5 text-primary mt-1" />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-lg font-mono">
                              {coupon.code}
                            </h4>
                            <Badge
                              variant={
                                coupon.status === "active"
                                  ? "success"
                                  : "secondary"
                              }
                            >
                              {coupon.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {coupon.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setEditingCoupon({
                              id: coupon.id,
                              code: coupon.code,
                              discount_type: coupon.discount_type,
                              discount_value: coupon.discount_value,
                              min_order_value: coupon.min_order_value ?? 0,
                              usage_limit: coupon.usage_limit ?? 100,
                              expires_at: coupon.expires_at ?? "",
                              description: coupon.description ?? "",
                            })
                          }
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setDeletingCoupon({
                              id: coupon.id,
                              code: coupon.code,
                            })
                          }
                        >
                          Delete
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Discount</p>
                        <p className="font-semibold">
                          {coupon.discount_type === "percentage"
                            ? `${coupon.discount_value}%`
                            : formatPrice(coupon.discount_value)}
                        </p>
                      </div>

                      <div>
                        <p className="text-muted-foreground">Min Order</p>
                        <p className="font-semibold">
                          {coupon.min_order_value ? formatPrice(coupon.min_order_value) : 'None'}
                        </p>
                      </div>

                      <div>
                        <p className="text-muted-foreground">Usage</p>
                        <p className="font-semibold">
                          {coupon.used_count} / {coupon.usage_limit ?? "∞"}
                        </p>
                      </div>

                      <div>
                        <p className="text-muted-foreground">Expires</p>
                        <p className="font-semibold">
                          {coupon.expires_at
                            ? new Date(coupon.expires_at).toLocaleDateString()
                            : "Never"}
                        </p>
                      </div>

                      <div>
                        <p className="text-muted-foreground">Status</p>
                        <p className="font-semibold capitalize">
                          {coupon.status}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        <CouponDialog
          isOpen={isCreating}
          onSave={handleCreate}
          onCancel={() => setIsCreating(false)}
        />

        {editingCoupon && (
          <CouponDialog
            isOpen
            coupon={editingCoupon}
            onSave={handleEdit}
            onCancel={() => setEditingCoupon(null)}
          />
        )}

      {deletingCoupon && (
        <DeleteConfirmDialog
          isOpen
          title="Delete Coupon"
          description="Are you sure you want to delete this coupon code?"
          itemName={deletingCoupon.code ?? "this coupon"}
          onConfirm={handleDelete}
          onCancel={() => setDeletingCoupon(null)}
        />
      )}
    </div>
  )
}
