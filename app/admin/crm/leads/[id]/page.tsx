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
import { ArrowLeft, Loader2, FileText, Mail, Phone, Calendar, MessageSquare, ArrowRight, Ticket as TicketIcon } from "lucide-react"

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
  performer?: { full_name: string | null; email: string } | null
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
  const [tickets, setTickets] = useState<any[]>([])
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
    fetchTickets()

    // Ensure data is fresh if user navigates back or focuses window
    const handleFocus = () => {
      fetchLogs()
      fetchQuotations()
      fetchTickets()
    }
    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [id])

  const fetchLead = async () => {
    try {
      const res = await fetch(`/api/admin/crm/leads/${id}`, { credentials: "include" })
      const data = await res.json()
      if (!res.ok || !data.lead) {
        toast.error(data.error || "Lead not found")
        router.push("/admin/crm/leads")
        return
      }
      setLead(data.lead)
      setStatus(data.lead.status)
      setFollowUpDate(data.lead.next_follow_up_date ?? "")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load lead")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchQuotations = async () => {
    try {
      const res = await fetch(`/api/admin/crm/leads/${id}/quotations?_t=${Date.now()}`, { 
        credentials: "include",
        cache: "no-store" 
      })
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
      const res = await fetch(`/api/admin/crm/leads/${id}/activity?_t=${Date.now()}`, { 
        credentials: "include",
        cache: "no-store" 
      })
      if (!res.ok) return
      const data = await res.json()
      setLogs(data.logs ?? [])
    } catch {
      // non-critical
    }
  }

  const fetchTickets = async () => {
    try {
      const res = await fetch(`/api/admin/crm/leads/${id}/tickets?_t=${Date.now()}`, { 
        credentials: "include",
        cache: "no-store" 
      })
      if (!res.ok) return
      const data = await res.json()
      setTickets(data.tickets ?? [])
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
              
              {/* Parse and Display Address if present in lead message */}
              {(() => {
                if (!lead.message) return null
                // Typical format: "Address: 123 Street Name, Dublin, County Dublin, D01 X2Y3"
                // Let's check if the message contains "Address:" prefix or look for it
                const addressMatch = lead.message.match(/Address:\s*([^\n]+)/i)
                if (addressMatch && addressMatch[1]) {
                  return (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wider">Address</p>
                      <p className="text-sm bg-muted/30 p-2 rounded whitespace-pre-wrap">{addressMatch[1].trim()}</p>
                    </div>
                  )
                }
                return null
              })()}

              <div className="pt-2 border-t">
                <span className="text-xs text-muted-foreground capitalize">Source: {lead.source}</span>
              </div>
              {lead.message && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Message</p>
                  <p className="text-sm bg-muted/40 p-2 rounded whitespace-pre-wrap">
                    {lead.message.replace(/Address:\s*[^\n]+\n*/i, "").trim()}
                  </p>
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
                {(() => {
                  let street = ""
                  let city = ""
                  let state = ""
                  let postcode = ""
                  if (lead.message) {
                    const addressMatch = lead.message.match(/Address:\s*([^\n]+)/i)
                    if (addressMatch && addressMatch[1]) {
                      const parts = addressMatch[1].split(",").map(p => p.trim())
                      // Parts order: Street, City, State/County, Postcode/Pincode
                      street = parts[0] || ""
                      city = parts[1] || ""
                      state = parts[2] || ""
                      postcode = parts[3] || ""
                    }
                  }
                  
                  const queryParams = new URLSearchParams({
                    name: lead.name,
                    email: lead.email || "",
                    phone: lead.phone || "",
                    lead_id: lead.id,
                    street,
                    city,
                    state,
                    postcode
                  })

                  return (
                    <Link href={`/admin/quotations/new?${queryParams.toString()}`}>
                      <FileText className="w-4 h-4 mr-2" />
                      Create Quote from Lead
                    </Link>
                  )
                })()}
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full mt-3 text-primary border-primary/20 hover:bg-primary/5"
              >
                <Link href={`/admin/tickets?new=true&lead_id=${lead.id}`}>
                  <TicketIcon className="w-4 h-4 mr-2" />
                  Create Ticket / Task
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
            <CardHeader><CardTitle>Linked Quotations ({quotations.length})</CardTitle></CardHeader>
            <CardContent>
              {quotations.length === 0 ? (
                <div className="text-center py-6">
                  <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No quotations linked to this lead yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Use "Create Quote from Lead" to get started.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {quotations.map(q => (
                    <div key={q.id} className="flex items-center justify-between p-4 neu-raised rounded-xl border-none">
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
                          q.status === "sent" ? "bg-amber-100 text-amber-800" :
                          q.status === "accepted" ? "bg-green-100 text-green-800" :
                          q.status === "declined" ? "bg-red-100 text-red-800" :
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

          {/* Linked Tickets */}
          <Card>
            <CardHeader><CardTitle>Linked Tickets & Tasks ({tickets.length})</CardTitle></CardHeader>
            <CardContent>
              {tickets.length === 0 ? (
                <div className="text-center py-6">
                  <TicketIcon className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No tickets linked to this lead yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Use "Create Ticket / Task" to get started.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tickets.map(t => (
                    <Link href={`/admin/tickets?ticket_id=${t.id}`} key={t.id} className="flex items-center justify-between p-4 neu-raised rounded-xl border-none hover:bg-muted/40 transition-colors cursor-pointer">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{t.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                          <span>{format(new Date(t.created_at), "dd MMM yyyy")}</span>
                          <span className={`capitalize px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            t.priority === "urgent" ? "bg-red-100 text-red-700" :
                            t.priority === "high" ? "bg-amber-100 text-amber-700" :
                            t.priority === "medium" ? "bg-blue-100 text-blue-700" :
                            "bg-gray-100 text-gray-700"
                          }`}>{t.priority}</span>
                          {t.assignee && (
                            <span className="text-muted-foreground">→ {t.assignee.full_name || t.assignee.email}</span>
                          )}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ml-3 ${
                        t.status === "open" ? "bg-blue-100 text-blue-800" :
                        t.status === "in_progress" ? "bg-amber-100 text-amber-800" :
                        t.status === "resolved" ? "bg-green-100 text-green-800" :
                        t.status === "closed" ? "bg-gray-100 text-gray-800" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {t.status.replace("_", " ")}
                      </span>
                    </Link>
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
                <p className="text-sm text-muted-foreground text-center py-6">No activity yet. Add a note above to start tracking interactions.</p>
              ) : (
                <div className="relative pl-6 border-l-2 border-primary/20 space-y-4">
                  {logs.map(log => (
                    <div key={log.id} className="relative">
                      <div className="absolute -left-[25px] top-1 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                      <div className="p-3 neu-raised rounded-xl text-sm">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="font-semibold capitalize">{log.action.replace(/_/g, " ")}</p>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(log.created_at), "dd MMM yyyy, HH:mm")}
                          </span>
                        </div>
                        {log.note && <p className="text-muted-foreground mt-1">{log.note}</p>}
                        {log.performer && (
                          <p className="text-xs text-primary/70 mt-1.5 font-medium">
                            — {log.performer.full_name || log.performer.email}
                          </p>
                        )}
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
