"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface DeleteConfirmDialogProps {
  isOpen: boolean
  title: string
  description: string
  itemName: string
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteConfirmDialog({
  isOpen,
  title,
  description,
  itemName,
  onConfirm,
  onCancel
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="font-semibold text-red-900">{itemName}</p>
          <p className="text-sm text-red-700 mt-1">This action cannot be undone.</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
