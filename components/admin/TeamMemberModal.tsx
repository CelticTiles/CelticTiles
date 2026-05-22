"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { TeamMember } from "@/hooks/useTeamMembers"
import { getSupabaseBrowserClient } from "@/lib/supabase"

interface TeamMemberModalProps {
  isOpen: boolean
  onClose: () => void
  onRefetch: () => Promise<void> | void
  member?: TeamMember | null // If null, we are in "Create" mode
}

type Role = "admin" | "sales"

interface TeamMemberFormState {
  full_name: string
  email: string
  role: Role
  permissions: string[]
  password: string
}

const INITIAL_FORM_STATE: TeamMemberFormState = {
  full_name: "",
  email: "",
  role: "sales",
  permissions: [],
  password: "",
}

export function TeamMemberModal({ isOpen, onClose, onRefetch, member }: TeamMemberModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState<TeamMemberFormState>(INITIAL_FORM_STATE)

  const isEditMode = !!member

  // Sync form data with member when modal opens or member changes
  useEffect(() => {
    if (isOpen) {
      if (member) {
        setFormData({
          full_name: member.full_name || "",
          email: member.email || "",
          role: member.role || "sales",
          permissions: member.permissions || [],
          password: "",
        })
      } else {
        setFormData(INITIAL_FORM_STATE)
      }
    }
  }, [isOpen, member])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleRoleChange = (value: Role) => {
    setFormData((prev) => ({ ...prev, role: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.full_name.trim()) {
      toast.error("Please enter a name")
      return
    }

    if (!formData.email.trim()) {
      toast.error("Please enter an email")
      return
    }

    if (!isEditMode && !formData.password) {
      toast.error("Please enter a password for new member")
      return
    }

    setIsSubmitting(true)

    try {
      const supabase = getSupabaseBrowserClient()
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session?.access_token) {
        throw new Error("Authentication required")
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

      if (!supabaseUrl || !anonKey) {
        throw new Error("Supabase configuration is missing")
      }

      const endpoint = `${supabaseUrl}/functions/v1/bright-handler`
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
          Authorization: `Bearer ${session.access_token}`,
          "x-client-info": "celtic-tiles-admin",
        },
        body: JSON.stringify({
          id: isEditMode ? member?.id : undefined,
          full_name: formData.full_name,
          email: formData.email,
          role: formData.role,
          password: isEditMode ? undefined : formData.password,
        }),
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(result?.error || result?.message || `Operation failed (${response.status})`)
      }

      toast.success(
        isEditMode
          ? "Team member updated successfully"
          : "Team member created successfully"
      )

      // Refetch team members and close
      await onRefetch()
      setFormData(INITIAL_FORM_STATE)
      onClose()
    } catch (err: any) {
      console.error("Error saving team member:", err)
      toast.error(err.message || "Failed to save team member")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setFormData(INITIAL_FORM_STATE)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Team Member" : "Add Team Member"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update the team member information"
              : "Add a new admin or sales team member"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              name="full_name"
              placeholder="John Doe"
              value={formData.full_name}
              onChange={handleInputChange}
              disabled={isSubmitting}
            />
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={handleInputChange}
              disabled={isSubmitting}
            />
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={formData.role} onValueChange={handleRoleChange}>
              <SelectTrigger id="role" disabled={isSubmitting}>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Password Field (Only for new members) */}
          {!isEditMode && (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter a Password"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Member can update their password using the reset password option if needed.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-red-700 hover:bg-red-800 text-white"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? "Update Member" : "Add Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
