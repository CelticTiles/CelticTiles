"use client"

import { useState, useMemo } from 'react'
import { useTeamMembers, TeamMember } from '@/hooks/useTeamMembers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Edit, Trash2, Search, AlertCircle, Mail, Users, Key } from 'lucide-react'
import { IconSpinner } from '@/components/ui/icon-spinner'
import { EmptyState } from '@/components/admin/EmptyState'
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog'
import { TeamMemberModal } from '@/components/admin/TeamMemberModal'
import { Pagination } from '@/components/admin/Pagination'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import * as React from "react"

interface TeamListClientProps {
  initialTeamMembers: TeamMember[]
  serverError?: string | null
}

export default function TeamListClient({ initialTeamMembers, serverError }: TeamListClientProps) {
  const { teamMembers: currentTeamMembers, addTeamMember, updateTeamMember, deleteTeamMember, resetTeamMemberPassword, refetch, isLoading } = useTeamMembers()
  
  // Use server-fetched data initially, then switch to hook data once loaded
  const teamMembers = !isLoading ? currentTeamMembers : initialTeamMembers
  
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [resetPasswordId, setResetPasswordId] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const itemsPerPage = 10

  // Filter and paginate
  const filteredMembers = useMemo(() => {
    return teamMembers.filter(member => {
      const searchLower = searchTerm.toLowerCase()
      return (
        member.email.toLowerCase().includes(searchLower) ||
        member.full_name?.toLowerCase().includes(searchLower) ||
        member.name?.toLowerCase().includes(searchLower) ||
        member.role.toLowerCase().includes(searchLower)
      )
    })
  }, [teamMembers, searchTerm])

  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage)
  const startIdx = (currentPage - 1) * itemsPerPage
  const currentMembers = filteredMembers.slice(startIdx, startIdx + itemsPerPage)

  const handleAddMember = () => {
    setSelectedMember(null)
    setIsModalOpen(true)
  }

  const handleEditMember = (member: TeamMember) => {
    setSelectedMember(member)
    setIsModalOpen(true)
  }

  const handleDeleteMember = async (id: string) => {
    try {
      await deleteTeamMember(id)
      setDeleteId(null)
      if (currentMembers.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1)
      }
    } catch (err: any) {
      console.error('Delete error:', err)
    }
  }

  const handleResetPassword = async () => {
    if (!resetPasswordId || !newPassword) return
    try {
      await resetTeamMemberPassword(resetPasswordId, newPassword)
      toast.success('Password reset successfully')
      setResetPasswordId(null)
      setNewPassword('')
    } catch (err: any) {
      toast.error('Failed to reset password: ' + err.message)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch(role?.toLowerCase()) {
      case 'admin':
        return 'bg-red-100 text-red-800'
      case 'sales':
        return 'bg-blue-100 text-blue-800'
      case 'inventory':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
          <p className="text-muted-foreground mt-1">Manage admin and sales team members</p>
        </div>
        <Button onClick={handleAddMember} className="w-full md:w-auto" suppressHydrationWarning>
          <Plus className="w-4 h-4 mr-2" />
          Add Member
        </Button>
      </div>

      {/* Server Error Alert */}
      {serverError && !isLoading && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-900">Warning</p>
            <p className="text-sm text-amber-800">{serverError}</p>
            <p className="text-xs text-amber-700 mt-1">Showing cached data. Try refreshing the page.</p>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            className="pl-9"
            suppressHydrationWarning
          />
        </div>
      </div>

      {/* Team List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            All Team Members ({filteredMembers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && initialTeamMembers.length === 0 ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <IconSpinner label="Loading team members..." />
            </div>
          ) : filteredMembers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No team members found"
              description={searchTerm ? "Try adjusting your search." : "Add your first team member to get started."}
              actionLabel={searchTerm ? "Clear Search" : "Add Member"}
              onAction={() => searchTerm ? setSearchTerm("") : handleAddMember()}
            />
          ) : (
            <>
              <div className="divide-y divide-border">
                {currentMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                          {member.name?.charAt(0).toUpperCase() || member.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{member.name || 'Unnamed'}</p>
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {member.email}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                      <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(member.role)}`}>
                        {member.role}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setResetPasswordId(member.id)
                          setNewPassword('')
                        }}
                        className="h-8 w-8 p-0"
                        suppressHydrationWarning
                      >
                        <Key className="w-4 h-4 text-slate-900" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditMember(member)}
                        className="h-8 w-8 p-0"
                        suppressHydrationWarning
                      >
                        <Edit className="w-4 h-4 text-slate-900" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(member.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        suppressHydrationWarning
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 pt-4 border-t border-border">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={filteredMembers.length}
                    itemsPerPage={itemsPerPage}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={!!deleteId}
        title="Delete Team Member"
        description="Are you sure you want to delete this team member? This action cannot be undone."
        itemName="team member"
        onConfirm={() => deleteId && handleDeleteMember(deleteId)}
        onCancel={() => setDeleteId(null)}
      />

          {/* Team Member Modal */}
          {isModalOpen && (
            <TeamMemberModal
              isOpen={isModalOpen}
              onClose={() => {
                setIsModalOpen(false)
                setSelectedMember(null)
              }}
              onRefetch={refetch}
              member={selectedMember}
            />
          )}

          {/* Reset Password Dialog */}
          {resetPasswordId && (
            <Dialog open={!!resetPasswordId} onOpenChange={(open) => !open && setResetPasswordId(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reset Password</DialogTitle>
                  <DialogDescription>Enter a new password for this team member</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    type="password"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setResetPasswordId(null)}>Cancel</Button>
                  <Button onClick={handleResetPassword} disabled={!newPassword}>Reset Password</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
    </div>
  )
}
