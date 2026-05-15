"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { ArrowLeft, Loader2, FileText, Mail, Phone, Calendar, MessageSquare, ArrowRight } from "lucide-react"

interface Lead {
  id: string
  name: string
  email: string
  phone: string | null
  source: string
  message: string | null
  status: string
  next_follow_up_date: string | null
  created_at: string
}

interface ActivityLog {
  id: string
  action: string
  note: string | null
  created_at: string
}

interface LinkedQuotation {
  id: string
  quote_number: string
  status: string
  total: number
  quote_date: string
}

const STATUS_COLORS: Record<string, string> = {
  New: "bg-blue-100 text-blue-800",
  Contacted: "bg-yellow-100 text-yellow-800",
  Quoted: "bg-purple-100 text-purple-800",
  Converted: "bg-green-100 text-green-800",
}

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [lead, setLead] = useState<Lead | null>(null)
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [quotations, setQuotations] = useState<LinkedQuotation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [status, setStatus] = useState("")
  const [followUpDate, setFollowUpDate] = useState("")
  const [note, setNote] = useState("")
  const [isAddingNote, setIsAddingNote] = useState(false)

  useEffect(() => {
    fetchLead()
    fetchLogs()
    fetchQuotations()
  }, [id])

  const fetchLead = async () => {
    try {
      const res = await fetch("/api/admin/crm/leads", { credentials: "include" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const found = (data.leads ?? []).find((l: Lead) => l.id === id)
      if (!found) { router.push("/admin/crm/leads"); return }
      setLead(found)
      setStatus(found.status)
      setFollowUpDate(found.next_follow_up_date ?? "")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load lead")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchQuotations = async () => {
    try {
      const res = await fetch(`/api/admin/crm/leads/${id}/quotations`, { credentials: "include" })
      if (!res.ok) return
      const data = await res.json()
      setQuotations(data.quotations ?? [])
    } catch {
      // non-critical
    }
  }

  const handleConvertToOrder = async (quotationId: string) => {
    try {
      const res = await fetch(`/api/admin/quotations/${quotationId}`, { credentials: "include" })
      if (!res.ok) throw new Error("Failed to load quotation")
      const { quotation } = await res.json()

      const quoteData = {
        quoteId: quotation.id,
        quoteNumber: quotation.quote_number,
        customerName: quotation.customer_name,
        customerEmail: quotation.customer_email || "",
        customerPhone: quotation.customer_phone || "",
        items: quotation.items,
        subtotal: quotation.subtotal,
        total: quotation.total,
        quoteDiscount: quotation.discount_enabled && quotation.discount_percentage
          ? quotation.subtotal * ((quotation.discount_percentage ?? 0) / 100)
          : 0,
        quoteDiscountPercentage: quotation.discount_percentage ?? 0,
        deliveryCollection: quotation.delivery_collection,
        deliveryAddress: quotation.delivery_collection === "Delivery" ? {
          street: [quotation.delivery_address_line1, quotation.delivery_address_line2].filter(Boolean).join(", "),
          city: quotation.delivery_city || "",
          state: quotation.delivery_city || "",
          pincode: quotation.delivery_postcode || "",
        } : undefined,
      }
      sessionStorage.setItem("quoteCart", JSON.stringify(quoteData))
      router.push("/quotecart")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load quotation")
    }
  }

  const fetchLogs = async () => {
    try {
      const res = await fetch(`/api/admin/crm/leads/${id}/activity`, { credentials: "include" })
      if (!res.ok) return
      const data = await res.json()
      setLogs(data.logs ?? [])
    } catch {
      // non-critical
    }
  }

  const handleSave = async () => {
    if (!lead) return
    setIsSaving(true)
    try {
      const res = await fetch("/api/admin/crm/leads", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: lead.id,
          status,
          next_follow_up_date: followUpDate || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setLead(prev => prev ? { ...prev, status, next_follow_up_date: followUpDate || null } : prev)
      toast.success("Lead updated")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update lead")
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddNote = async () => {
    if (!note.trim() || !lead) return
    setIsAddingNote(true)
    try {
      const res = await fetch(`/api/admin/crm/leads/${lead.id}/activity`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "note_added", note: note.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setLogs(prev => [data.log, ...prev])
      setNote("")
      toast.success("Note added")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add note")
    } finally {
      setIsAddingNote(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!lead) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/crm/leads">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">{lead.name}</h1>
          <p className="text-muted-foreground mt-1">Lead Detail</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Contact Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Contact Information</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                <span>{lead.email}</span>
              </div>
              {lead.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span>{lead.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                <span>Received {format(new Date(lead.created_at), "dd MMM yyyy")}</span>
              </div>
              <div className="pt-2 border-t">
                <span className="text-xs text-muted-foreground capitalize">Source: {lead.source}</span>
              </div>
              {lead.message && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Message</p>
                  <p className="text-sm bg-muted/40 p-2 rounded">{lead.message}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Convert to Quote */}
          <Card>
            <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
            <CardContent>
              <Button
                asChild
                className="w-full neu-raised border-transparent text-white"
              >
                <Link href={`/admin/quotations/new?name=${encodeURIComponent(lead.name)}&email=${encodeURIComponent(lead.email || "")}&phone=${encodeURIComponent(lead.phone || "")}&lead_id=${lead.id}`}>
                  <FileText className="w-4 h-4 mr-2" />
                  Create Quote from Lead
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right — Status + Follow-up + Notes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status & Follow-up */}
          <Card>
            <CardHeader><CardTitle>Lead Management</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New">New</SelectItem>
                      <SelectItem value="Contacted">Contacted</SelectItem>
                      <SelectItem value="Quoted">Quoted</SelectItem>
                      <SelectItem value="Converted">Converted</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[status] || ""}`}>
                      {status}
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Next Follow-up Date</Label>
                  <Input
                    type="date"
                    value={followUpDate}
                    onChange={e => setFollowUpDate(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={handleSave} disabled={isSaving} className="neu-raised border-transparent text-white">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </CardContent>
          </Card>

          {/* Linked Quotations */}
          <Card>
            <CardHeader><CardTitle>Linked Quotations</CardTitle></CardHeader>
            <CardContent>
              {quotations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No quotations yet</p>
              ) : (
                <div className="space-y-3">
                  {quotations.map(q => (
                    <div key={q.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div>
                        <Link href={`/admin/quotations/${q.id}`} className="font-semibold text-primary hover:underline text-sm">
                          {q.quote_number}
                        </Link>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(q.quote_date), "dd MMM yyyy")} · €{Number(q.total).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          q.status === "draft" ? "bg-blue-100 text-blue-800" :
                          q.status === "accepted" ? "bg-green-100 text-green-800" :
                          "bg-gray-100 text-gray-700"
                        }`}>{q.status}</span>
                        {q.status === "draft" && (
                          <Button
                            size="sm"
                            onClick={() => handleConvertToOrder(q.id)}
                            className="neu-raised border-transparent text-white text-xs h-7"
                          >
                            Convert to Order
                            <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add Note */}
          <Card>
            <CardHeader><CardTitle>Add Note / Interaction</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="Log a call, meeting, or any interaction..."
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={3}
              />
              <Button onClick={handleAddNote} disabled={isAddingNote || !note.trim()} variant="outline" className="neu-raised border-transparent">
                {isAddingNote ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MessageSquare className="h-4 w-4 mr-2" />}
                Add Note
              </Button>
            </CardContent>
          </Card>

          {/* Activity Log */}
          <Card>
            <CardHeader><CardTitle>Activity Log</CardTitle></CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No activity yet</p>
              ) : (
                <div className="space-y-3">
                  {logs.map(log => (
                    <div key={log.id} className="flex gap-3 p-3 bg-muted/30 rounded-lg text-sm">
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium capitalize">{log.action.replace(/_/g, " ")}</p>
                        {log.note && <p className="text-muted-foreground mt-0.5">{log.note}</p>}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(log.created_at), "dd MMM yyyy, HH:mm")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
