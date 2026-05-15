"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FeedbackResponseDialog } from "@/components/admin/FeedbackResponseDialog"
import { formatOrderDate } from "@/lib/order-utils"
import { MessageSquare, AlertCircle } from "lucide-react"

export interface FeedbackResponse {
  id: string
  feedback_id: string
  responded_by: string
  message: string
  created_at: string
}

export interface Feedback {
  id: string
  customer_id: string
  customer_name: string
  customer_email: string
  subject: string
  category: 'Support' | 'Complaint' | 'Enquiry' | 'Suggestion'
  message: string
  priority: 'Low' | 'Medium' | 'High'
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed'
  assigned_to: string | null
  created_at: string
  responses: FeedbackResponse[]
}

interface FeedbackClientProps {
  initialFeedbacks: Feedback[]
  adminName: string
}

export default function FeedbackClient({ initialFeedbacks, adminName }: FeedbackClientProps) {
  const router = useRouter()
  const [respondingTo, setRespondingTo] = useState<{ id: string; subject: string } | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  const openTickets = initialFeedbacks.filter(f => f.status === "Open" || f.status === "In Progress")
  const resolvedTickets = initialFeedbacks.filter(f => f.status === "Resolved" || f.status === "Closed")

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High": return "destructive"
      case "Medium": return "warning"
      default: return "secondary"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Open": return "destructive"
      case "In Progress": return "warning"
      case "Resolved": return "success"
      default: return "secondary"
    }
  }

  const updateStatus = async (feedbackId: string, status: string) => {
    try {
      setIsUpdating(true)
      const res = await fetch(`/api/admin/feedback/${feedbackId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error("Failed to update status")
      toast.success("Status updated")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleAssign = (feedbackId: string) => updateStatus(feedbackId, "In Progress")
  const handleResolve = (feedbackId: string) => updateStatus(feedbackId, "Resolved")

  const handleRespond = async (feedbackId: string, message: string) => {
    try {
      setIsUpdating(true)
      const res = await fetch(`/api/admin/feedback/${feedbackId}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, respondedBy: adminName }),
      })
      if (!res.ok) throw new Error("Failed to send response")
      toast.success("Response added")
      setRespondingTo(null)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-primary">Support Tickets</h1>
        <p className="text-muted-foreground mt-1">Manage customer support and feedback</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Tickets ({openTickets.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {openTickets.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No open tickets</p>
          ) : (
            openTickets.map((ticket) => (
              <div key={ticket.id} className="border border-border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{ticket.subject}</h4>
                      <Badge variant={getPriorityColor(ticket.priority) as any}>
                        {ticket.priority}
                      </Badge>
                      <Badge variant={getStatusColor(ticket.status) as any}>
                        {ticket.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {ticket.customer_name || 'Customer'} ({ticket.customer_email || ''}) • {formatOrderDate(ticket.created_at || '')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Category: {ticket.category}
                    </p>
                  </div>
                  {ticket.priority === "High" && (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
                
                <p className="text-sm mb-3 p-3 bg-accent/10 rounded">{ticket.message}</p>
                
                {ticket.responses.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {ticket.responses.map((response) => (
                      <div key={response.id} className="bg-blue-50 p-3 rounded text-sm">
                        <p className="font-semibold text-xs mb-1">
                          {response.responded_by} • {formatOrderDate(response.created_at)}
                        </p>
                        <p>{response.message}</p>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button 
                    size="sm"
                    disabled={isUpdating}
                    onClick={() => setRespondingTo({ id: ticket.id, subject: ticket.subject })}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Respond
                  </Button>
                  {ticket.status === "Open" && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      disabled={isUpdating}
                      onClick={() => handleAssign(ticket.id)}
                    >
                      Assign to me
                    </Button>
                  )}
                  {ticket.status === "In Progress" && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      disabled={isUpdating}
                      onClick={() => handleResolve(ticket.id)}
                    >
                      Mark Resolved
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resolved Tickets ({resolvedTickets.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {resolvedTickets.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No resolved tickets</p>
          ) : (
            <div className="space-y-2">
              {resolvedTickets.map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between p-3 border border-border rounded">
                  <div>
                    <p className="font-medium">{ticket.subject}</p>
                    <p className="text-sm text-muted-foreground">{ticket.customer_name}</p>
                  </div>
                  <Badge variant="success">Resolved</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {respondingTo && (
        <FeedbackResponseDialog
          isOpen={!!respondingTo}
          feedbackId={respondingTo.id}
          feedbackSubject={respondingTo.subject}
          onSend={(id, msg) => handleRespond(id, msg)}
          onCancel={() => setRespondingTo(null)}
        />
      )}
    </div>
  )
}
