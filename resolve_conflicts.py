import re

with open('app/admin/crm/leads/[id]/page.tsx', 'r') as f:
    content = f.read()

# Conflict 1
c1 = """<<<<<<< Updated upstream
import { ArrowLeft, Loader2, FileText, Mail, Phone, Calendar, MessageSquare, ArrowRight, Ticket as TicketIcon, MapPin, Pencil, Save, X } from "lucide-react"
=======
import { ArrowLeft, Loader2, FileText, Mail, Phone, Calendar, MessageSquare, ArrowRight, Ticket as TicketIcon, Pencil } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
>>>>>>> Stashed changes"""

r1 = """import { ArrowLeft, Loader2, FileText, Mail, Phone, Calendar, MessageSquare, ArrowRight, Ticket as TicketIcon, MapPin, Pencil, Save, X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog" """

content = content.replace(c1, r1)

# Conflict 2
c2 = """<<<<<<< Updated upstream
  const [address, setAddress] = useState<Address>(EMPTY_ADDRESS)
  const [addressDraft, setAddressDraft] = useState<Address>(EMPTY_ADDRESS)
  const [isEditingAddress, setIsEditingAddress] = useState(false)
  const [isSavingAddress, setIsSavingAddress] = useState(false)
=======
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editName, setEditName] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [editAddress, setEditAddress] = useState("")
  const [editMessage, setEditMessage] = useState("")
  const [isUpdatingDetails, setIsUpdatingDetails] = useState(false)
>>>>>>> Stashed changes"""

r2 = """  const [address, setAddress] = useState<Address>(EMPTY_ADDRESS)
  const [addressDraft, setAddressDraft] = useState<Address>(EMPTY_ADDRESS)
  const [isEditingAddress, setIsEditingAddress] = useState(false)
  const [isSavingAddress, setIsSavingAddress] = useState(false)

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editName, setEditName] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [editAddress, setEditAddress] = useState("")
  const [editMessage, setEditMessage] = useState("")
  const [isUpdatingDetails, setIsUpdatingDetails] = useState(false)"""

content = content.replace(c2, r2)

# Conflict 3
c3 = """<<<<<<< Updated upstream
  const handleStartEditAddress = () => {
    setAddressDraft(address)
    setIsEditingAddress(true)
  }

  const handleSaveAddress = async () => {
    if (!lead) return
    setIsSavingAddress(true)
    try {
      const newMessage = buildMessage(lead.message, addressDraft)
=======
  const openEditDialog = () => {
    if (!lead) return
    setEditName(lead.name || "")
    setEditEmail(lead.email || "")
    setEditPhone(lead.phone || "")
    
    const addressMatch = lead.message?.match(/Address:\\s*([^\\n]+)/i)
    setEditAddress(addressMatch ? addressMatch[1].trim() : "")
    setEditMessage(lead.message ? lead.message.replace(/Address:\\s*([^\\n]+)\\n*/i, "").trim() : "")
    
    setIsEditDialogOpen(true)
  }

  const handleUpdateDetails = async () => {
    if (!lead) return
    setIsUpdatingDetails(true)
    
    const combinedMessage = [
      editAddress.trim() ? `Address: ${editAddress.trim()}` : "",
      editMessage.trim()
    ].filter(Boolean).join("\\n\\n")

    try {
>>>>>>> Stashed changes
      const res = await fetch("/api/admin/crm/leads", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
<<<<<<< Updated upstream
        body: JSON.stringify({ id: lead.id, message: newMessage }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setLead(prev => prev ? { ...prev, message: newMessage } : prev)
      setAddress(addressDraft)
      setIsEditingAddress(false)
      toast.success("Address updated")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update address")
    } finally {
      setIsSavingAddress(false)
=======
        body: JSON.stringify({
          id: lead.id,
          name: editName,
          email: editEmail,
          phone: editPhone,
          message: combinedMessage
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      
      setLead(prev => prev ? { 
        ...prev, 
        name: editName, 
        email: editEmail, 
        phone: editPhone, 
        message: combinedMessage 
      } : prev)
      setIsEditDialogOpen(false)
      toast.success("Lead details updated")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update details")
    } finally {
      setIsUpdatingDetails(false)
>>>>>>> Stashed changes
    }
  }"""

r3 = """  const handleStartEditAddress = () => {
    setAddressDraft(address)
    setIsEditingAddress(true)
  }

  const handleSaveAddress = async () => {
    if (!lead) return
    setIsSavingAddress(true)
    try {
      const newMessage = buildMessage(lead.message, addressDraft)
      const res = await fetch("/api/admin/crm/leads", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id, message: newMessage }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setLead(prev => prev ? { ...prev, message: newMessage } : prev)
      setAddress(addressDraft)
      setIsEditingAddress(false)
      toast.success("Address updated")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update address")
    } finally {
      setIsSavingAddress(false)
    }
  }

  const openEditDialog = () => {
    if (!lead) return
    setEditName(lead.name || "")
    setEditEmail(lead.email || "")
    setEditPhone(lead.phone || "")
    
    const addressMatch = lead.message?.match(/Address:\\s*([^\\n]+)/i)
    setEditAddress(addressMatch ? addressMatch[1].trim() : "")
    setEditMessage(lead.message ? lead.message.replace(/Address:\\s*([^\\n]+)\\n*/i, "").trim() : "")
    
    setIsEditDialogOpen(true)
  }

  const handleUpdateDetails = async () => {
    if (!lead) return
    setIsUpdatingDetails(true)
    
    const combinedMessage = [
      editAddress.trim() ? `Address: ${editAddress.trim()}` : "",
      editMessage.trim()
    ].filter(Boolean).join("\\n\\n")

    try {
      const res = await fetch("/api/admin/crm/leads", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: lead.id,
          name: editName,
          email: editEmail,
          phone: editPhone,
          message: combinedMessage
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      
      setLead(prev => prev ? { 
        ...prev, 
        name: editName, 
        email: editEmail, 
        phone: editPhone, 
        message: combinedMessage 
      } : prev)
      setIsEditDialogOpen(false)
      toast.success("Lead details updated")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update details")
    } finally {
      setIsUpdatingDetails(false)
    }
  }"""

content = content.replace(c3, r3)

with open('app/admin/crm/leads/[id]/page.tsx', 'w') as f:
    f.write(content)
