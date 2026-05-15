"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface CouponFormData {
  code: string
  description: string
  discount_type: "percentage" | "fixed"
  discount_value: number
  min_order_value: number
  usage_limit: number
  expires_at: string
}

type EditingCoupon = {
  id: string
} & Partial<CouponFormData>

interface CouponDialogProps {
  isOpen: boolean
  coupon?: EditingCoupon
  onSave: (data: CouponFormData) => void
  onCancel: () => void
}

export function CouponDialog({
  isOpen,
  coupon,
  onSave,
  onCancel
}: CouponDialogProps) {
  const [formData, setFormData] = useState<CouponFormData>({
    code: coupon?.code || "",
    description: coupon?.description || "",
    discount_type: coupon?.discount_type || "percentage",
    discount_value: coupon?.discount_value || 0,
    min_order_value: coupon?.min_order_value || 0,
    usage_limit: coupon?.usage_limit || 100,
    expires_at: coupon?.expires_at ? coupon.expires_at.split('T')[0] : ""
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Convert bare date to end-of-day UTC so the coupon is valid for the entire expiry day
    const submissionData = { ...formData }
    if (submissionData.expires_at && !submissionData.expires_at.includes('T')) {
      submissionData.expires_at = `${submissionData.expires_at}T23:59:59.999Z`
    }
    onSave(submissionData)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{coupon ? "Edit Coupon" : "Create Coupon"}</DialogTitle>
          <DialogDescription>
            {coupon ? "Update" : "Create a new"} discount code for customers
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Coupon Code</label>
            <Input
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="NEWYEAR2026"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="New Year Special - 15% off"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Discount Type</label>
              <select
                className="w-full p-2 border border-border rounded-lg"
                value={formData.discount_type}
                onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as "percentage" | "fixed" })}
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                {formData.discount_type === "percentage" ? "Percentage (%)" : "Amount (₹)"}
              </label>
              <Input
                type="number"
                value={formData.discount_value}
                onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Usage Limit</label>
              <Input
                type="number"
                value={formData.usage_limit}
                onChange={(e) => setFormData({ ...formData, usage_limit: parseInt(e.target.value) })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Expires At</label>
              <Input
                type="date"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Min Order Value (€)</label>
            <Input
              type="number"
              value={formData.min_order_value}
              onChange={(e) => setFormData({ ...formData, min_order_value: parseFloat(e.target.value) })}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground mt-1">Minimum order amount required to use this coupon</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">
              {coupon ? "Update" : "Create"} Coupon
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
