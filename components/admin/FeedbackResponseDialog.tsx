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

interface FeedbackResponseDialogProps {
  isOpen: boolean
  feedbackId: string
  feedbackSubject: string
  onSend: (feedbackId: string, message: string) => void
  onCancel: () => void
}

export function FeedbackResponseDialog({
  isOpen,
  feedbackId,
  feedbackSubject,
  onSend,
  onCancel
}: FeedbackResponseDialogProps) {
  const [message, setMessage] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim()) {
      onSend(feedbackId, message)
      setMessage("")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Respond to Support Ticket</DialogTitle>
          <DialogDescription>
            {feedbackSubject}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Your Response</label>
            <textarea
              className="w-full min-h-[120px] p-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Type your response here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">
              Send Response
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
