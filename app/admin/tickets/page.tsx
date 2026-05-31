"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Plus, Search, LayoutGrid, List as ListIcon, Calendar, MessageSquare, Clock, Users2, Download } from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import type { Ticket, TicketComment } from "@/lib/supabase-types"
import { format, parseISO } from "date-fns"

const STATUSES = ["open", "assigned", "in_progress", "pending", "resolved", "closed"] as const
const PRIORITIES = ["low", "medium", "high", "urgent"] as const
const CATEGORIES = ["measurements", "quote", "installation"]

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-800 border-blue-200",
  assigned: "bg-indigo-100 text-indigo-800 border-indigo-200",
  in_progress: "bg-amber-100 text-amber-800 border-amber-200",
  pending: "bg-orange-100 text-orange-800 border-orange-200",
  resolved: "bg-green-100 text-green-800 border-green-200",
  closed: "bg-gray-100 text-gray-800 border-gray-200",
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700",
}

function TicketsContent() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [view, setView] = useState<"board" | "list">("board")
  
  // Filters
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dueDateFilter, setDueDateFilter] = useState("")
  
  // Profiles and Leads for assignment
  const [profiles, setProfiles] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])

  const searchParams = useSearchParams()

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createForm, setCreateForm] = useState({
    title: "", description: "", priority: "medium", category: "measurements", assigned_to: "", due_date: "", lead_id: "none"
  })

  // Details Modal
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [comments, setComments] = useState<TicketComment[]>([])
  const [newComment, setNewComment] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    fetchTickets()
    fetchProfiles()
    fetchLeads()
  }, [])

  useEffect(() => {
    if (searchParams.get("new") === "true") {
      setShowCreateModal(true)
      const urlLeadId = searchParams.get("lead_id")
      if (urlLeadId) {
        setCreateForm(prev => ({ ...prev, lead_id: urlLeadId }))
      }
    }
  }, [searchParams])

  useEffect(() => {
    const ticketId = searchParams.get("ticket_id")
    if (ticketId && tickets.length > 0) {
      const found = tickets.find(t => t.id === ticketId)
      if (found) {
        openDetails(found)
      }
    }
  }, [tickets, searchParams])

  const fetchTickets = async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/admin/tickets", { credentials: "include" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTickets(data.tickets || [])
    } catch (error: any) {
      toast.error(error.message || "Failed to load tickets")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchProfiles = async () => {
    try {
      const res = await fetch("/api/admin/team", { credentials: "include" })
      const data = await res.json()
      if (res.ok) {
        setProfiles(data.team || [])
      }
    } catch (e) {
      console.error("Failed to load profiles", e)
    }
  }

  const fetchLeads = async () => {
    try {
      const res = await fetch("/api/admin/crm/leads?compact=true", { credentials: "include" })
      const data = await res.json()
      if (res.ok) setLeads(data.leads || [])
    } catch (e) {
      console.error("Failed to load leads", e)
    }
  }

  const handleCreate = async () => {
    if (!createForm.title) return toast.error("Title is required")
    setIsCreating(true)
    try {
      const urlLeadId = searchParams.get("lead_id")
      let finalLeadId = createForm.lead_id;
      if (!finalLeadId || finalLeadId === "none") {
        finalLeadId = urlLeadId || undefined;
      }
      
      const payload = {
        ...createForm,
        lead_id: finalLeadId
      }
      const res = await fetch("/api/admin/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTickets(prev => [data.ticket, ...prev])
      setShowCreateModal(false)
      setCreateForm({ title: "", description: "", priority: "medium", category: "inventory", assigned_to: "", due_date: "", lead_id: "none" })
      toast.success("Ticket created")
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsCreating(false)
    }
  }

  const openDetails = async (ticket: Ticket) => {
    setSelectedTicket(ticket)
    setComments([])
    try {
      const res = await fetch(`/api/admin/tickets/${ticket.id}/comments`, { credentials: "include" })
      const data = await res.json()
      if (res.ok) {
        setComments(data.comments || [])
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleUpdateStatus = async (status: string) => {
    if (!selectedTicket) return
    setIsUpdating(true)
    try {
      const res = await fetch(`/api/admin/tickets/${selectedTicket.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? data.ticket : t))
      setSelectedTicket(data.ticket)
      toast.success("Status updated")
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedTicket) return
    try {
      const res = await fetch(`/api/admin/tickets/${selectedTicket.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: newComment })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setComments(prev => [...prev, data.comment])
      setNewComment("")
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
                          (t.assignee?.full_name?.toLowerCase() || "").includes(search.toLowerCase())
      const matchStatus = statusFilter === "all" || t.status === statusFilter
      const matchDate = !dueDateFilter || (t.due_date && t.due_date.startsWith(dueDateFilter))
      return matchSearch && matchStatus && matchDate
    })
  }, [tickets, search, statusFilter, dueDateFilter])

  const handleDownloadPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text("Tickets & Tasks Report", 14, 20)
    
    if (dueDateFilter) {
      doc.setFontSize(10)
      doc.text(`Due Date Filter: ${dueDateFilter}`, 14, 28)
    }

    const tableData = filteredTickets.map(t => [
      t.title,
      t.status.replace("_", " ").toUpperCase(),
      t.priority.toUpperCase(),
      t.assignee?.full_name || "Unassigned",
      t.due_date ? format(parseISO(t.due_date), "dd MMM yyyy") : "—"
    ])

    autoTable(doc, {
      startY: dueDateFilter ? 32 : 25,
      head: [["Title", "Status", "Priority", "Assignee", "Due Date"]],
      body: tableData,
    })

    doc.save(`Tickets_Report_${format(new Date(), "yyyy-MM-dd")}.pdf`)
  }

  // Board columns
  const columns = STATUSES.map(s => ({
    id: s,
    title: s.replace("_", " ").toUpperCase(),
    tickets: filteredTickets.filter(t => t.status === s)
  }))

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">Tickets & Tasks</h1>
          <p className="text-muted-foreground mt-1">Assign and track store operations.</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="neu-raised border-transparent text-white">
          <Plus className="w-4 h-4 mr-2" /> New Task
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-card p-3 rounded-2xl neu-raised">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search tasks or assignees..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="pl-9"
          />
        </div>
        <Input 
          type="date" 
          value={dueDateFilter} 
          onChange={(e) => setDueDateFilter(e.target.value)} 
          className="w-36"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handleDownloadPDF} className="h-10 border-border">
          <Download className="h-4 w-4 mr-2" /> PDF
        </Button>
        <div className="flex items-center bg-muted/50 p-1 rounded-lg">
          <Button 
            variant={view === "board" ? "secondary" : "ghost"} 
            size="sm" 
            onClick={() => setView("board")}
            className={view === "board" ? "shadow-sm" : ""}
          >
            <LayoutGrid className="h-4 w-4 mr-2" /> Board
          </Button>
          <Button 
            variant={view === "list" ? "secondary" : "ghost"} 
            size="sm" 
            onClick={() => setView("list")}
            className={view === "list" ? "shadow-sm" : ""}
          >
            <ListIcon className="h-4 w-4 mr-2" /> List
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : view === "board" ? (
        /* Kanban Board */
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x px-1">
          {columns.map(col => (
            <div key={col.id} className="min-w-[300px] w-[300px] flex flex-col bg-muted/30 neu-pressed rounded-2xl p-3 snap-start border border-border/50">
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="font-semibold text-sm text-foreground">{col.title}</h3>
                <span className="text-xs bg-background text-muted-foreground px-2 py-0.5 rounded-full shadow-sm">
                  {col.tickets.length}
                </span>
              </div>
              <div className="flex flex-col gap-3 flex-1">
                {col.tickets.map(ticket => (
                  <div 
                    key={ticket.id} 
                    onClick={() => openDetails(ticket)}
                    className="bg-card p-4 rounded-xl neu-raised border border-transparent cursor-pointer hover:border-primary/30 transition-all group hover:scale-[1.01]"
                  >
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${PRIORITY_COLORS[ticket.priority]}`}>
                        {ticket.priority}
                      </span>
                      {ticket.category && (
                        <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full capitalize">
                          {ticket.category}
                        </span>
                      )}
                    </div>
                    <h4 className="font-semibold text-sm leading-tight mb-3 group-hover:text-primary transition-colors">{ticket.title}</h4>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[9px]">
                          {ticket.assignee ? ticket.assignee.full_name?.charAt(0) || "U" : "?"}
                        </div>
                        <span className="truncate max-w-[100px]">{ticket.assignee ? ticket.assignee.full_name : "Unassigned"}</span>
                      </div>
                      {ticket.due_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(parseISO(ticket.due_date), "MMM d")}
                        </div>
                      )}
                    </div>
                    {ticket.lead && (
                      <div className="mt-3 pt-2 border-t border-border/40 text-[10px] text-muted-foreground flex items-center gap-1.5">
                        <Users2 className="w-3 h-3 shrink-0" />
                        <span className="truncate">Lead: {ticket.lead.name}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-card rounded-2xl neu-raised overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground border-b border-border/40 bg-muted/20">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Assignee</th>
                  <th className="px-4 py-3 font-medium">Due Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map(ticket => (
                  <tr key={ticket.id} onClick={() => openDetails(ticket)} className="border-b border-border/30 last:border-0 hover:bg-muted/30 cursor-pointer">
                    <td className="px-4 py-4 font-medium text-foreground">{ticket.title}</td>
                    <td className="px-4 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_COLORS[ticket.status]}`}>
                        {ticket.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${PRIORITY_COLORS[ticket.priority]}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground capitalize">{ticket.category}</td>
                    <td className="px-4 py-4">{ticket.assignee ? ticket.assignee.full_name : <span className="text-muted-foreground italic">Unassigned</span>}</td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {ticket.due_date ? format(parseISO(ticket.due_date), "dd MMM yyyy") : "—"}
                    </td>
                  </tr>
                ))}
                {filteredTickets.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No tasks found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Task Title *</Label>
              <Input value={createForm.title} onChange={e => setCreateForm({...createForm, title: e.target.value})} placeholder="E.g., Restock showroom tiles" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={createForm.description} onChange={e => setCreateForm({...createForm, description: e.target.value})} placeholder="Add details..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={createForm.priority} onValueChange={v => setCreateForm({...createForm, priority: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p.toUpperCase()}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={createForm.category} onValueChange={v => setCreateForm({...createForm, category: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c.replace("_", " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Assign To</Label>
                <Select value={createForm.assigned_to} onValueChange={v => setCreateForm({...createForm, assigned_to: v})}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {profiles.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input type="date" value={createForm.due_date} onChange={e => setCreateForm({...createForm, due_date: e.target.value})} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Link to CRM Lead (Optional)</Label>
                <Select value={createForm.lead_id || searchParams.get("lead_id") || "none"} onValueChange={v => setCreateForm({...createForm, lead_id: v})}>
                  <SelectTrigger><SelectValue placeholder="No Lead Selected" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Lead</SelectItem>
                    {searchParams.get("lead_id") && !leads.find(l => l.id === searchParams.get("lead_id")) && (
                      <SelectItem value={searchParams.get("lead_id") as string}>Linked Lead</SelectItem>
                    )}
                    {leads.map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)} disabled={isCreating}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isCreating} className="neu-raised border-transparent text-white">
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Modal */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="sm:max-w-2xl bg-background p-0 overflow-hidden">
          {selectedTicket && (
            <div className="flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="p-5 border-b border-border bg-card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${PRIORITY_COLORS[selectedTicket.priority]}`}>
                        {selectedTicket.priority}
                      </span>
                      <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full capitalize">
                        {selectedTicket.category}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(parseISO(selectedTicket.created_at), "MMM d, HH:mm")}
                      </span>
                    </div>
                    <DialogTitle className="text-xl">{selectedTicket.title}</DialogTitle>
                  </div>
                  <Select value={selectedTicket.status} onValueChange={handleUpdateStatus} disabled={isUpdating}>
                    <SelectTrigger className={`w-36 h-8 text-xs font-semibold ${STATUS_COLORS[selectedTicket.status]}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Description */}
                {selectedTicket.description && (
                  <div className="text-sm text-foreground whitespace-pre-wrap bg-muted/30 p-4 rounded-xl border border-border/50">
                    {selectedTicket.description}
                  </div>
                )}
                
                {/* Meta details */}
                <div className="flex flex-wrap gap-6 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Assignee</p>
                    <div className="flex items-center gap-2 font-medium">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs">
                        {selectedTicket.assignee ? selectedTicket.assignee.full_name?.charAt(0) : "?"}
                      </div>
                      {selectedTicket.assignee ? selectedTicket.assignee.full_name : "Unassigned"}
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Created By</p>
                    <div className="font-medium">{selectedTicket.creator?.full_name || "System"}</div>
                  </div>
                  {selectedTicket.due_date && (
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Due Date</p>
                      <div className="flex items-center gap-1.5 font-medium text-amber-700">
                        <Calendar className="w-4 h-4" />
                        {format(parseISO(selectedTicket.due_date), "MMM d, yyyy")}
                      </div>
                    </div>
                  )}
                  {selectedTicket.lead && (
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Linked Lead</p>
                      <Link href={`/admin/crm/leads/${selectedTicket.lead.id}`} className="font-medium text-primary hover:underline flex items-center gap-1.5">
                        <Users2 className="w-4 h-4" />
                        {selectedTicket.lead.name}
                      </Link>
                    </div>
                  )}
                </div>

                {/* Comments Section */}
                <div className="pt-4 border-t border-border">
                  <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Discussion ({comments.length})
                  </h3>
                  
                  <div className="space-y-4 mb-4">
                    {comments.map(c => (
                      <div key={c.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0 mt-1">
                          {c.author?.full_name?.charAt(0) || "U"}
                        </div>
                        <div className="flex-1 bg-card border border-border/60 rounded-2xl rounded-tl-none p-3 shadow-sm">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-xs">{c.author?.full_name}</span>
                            <span className="text-[10px] text-muted-foreground">{format(parseISO(c.created_at), "MMM d, HH:mm")}</span>
                          </div>
                          <p className="text-sm text-foreground whitespace-pre-wrap">{c.comment}</p>
                        </div>
                      </div>
                    ))}
                    {comments.length === 0 && (
                      <p className="text-sm text-muted-foreground italic text-center py-4">No comments yet. Start the conversation!</p>
                    )}
                  </div>
                  
                  {/* Add Comment Input */}
                  <div className="flex gap-3 mt-4">
                    <Textarea 
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      placeholder="Type a comment or update..." 
                      className="min-h-[80px] resize-none"
                    />
                    <Button onClick={handleAddComment} disabled={!newComment.trim()} className="self-end neu-raised text-white border-transparent">
                      Send
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function TicketsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>}>
      <TicketsContent />
    </Suspense>
  )
}
