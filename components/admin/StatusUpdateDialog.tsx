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

interface StatusUpdateDialogProps {
  isOpen: boolean
  currentStatus: string
  newStatus: string
  onConfirm: (note: string) => void
  onCancel: () => void
  isLoading?: boolean
}

export function StatusUpdateDialog({
  isOpen,
  currentStatus,
  newStatus,
  onConfirm,
  onCancel,
  isLoading = false
}: StatusUpdateDialogProps) {
  const [note, setNote] = useState("")

  const handleConfirm = () => {
    onConfirm(note)
    setNote("") // Clear note after confirm
  }

  const handleCancel = () => {
    setNote("") // Clear note on cancel
    onCancel()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Order Status</DialogTitle>
          <DialogDescription>
            Change status from <strong>{currentStatus}</strong> to <strong>{newStatus}</strong>?
          </DialogDescription>
        </DialogHeader>

        {/* <div className="py-4">
          <label htmlFor="status-note" className="block text-sm font-medium mb-2">
            Add Note (Optional)
          </label>
          <textarea
            id="status-note"
            className="w-full min-h-[80px] p-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Add a note about this status change..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div> */}

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? "Updating..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
