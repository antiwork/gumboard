"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, UserPlus, Shield, ShieldCheck, Link, Copy, Calendar, Users } from "lucide-react"
import { Loader } from "@/components/ui/loader"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface User {
  id: string
  name: string | null
  email: string
  isAdmin: boolean
  organization: {
    id: string
    name: string
    members: {
      id: string
      name: string | null
      email: string
      isAdmin: boolean
    }[]
  } | null
}

interface OrganizationInvite {
  id: string
  email: string
  status: string
  createdAt: string
}

interface SelfServeInvite {
  id: string
  token: string
  name: string
  createdAt: string
  expiresAt: string | null
  usageLimit: number | null
  usageCount: number
  isActive: boolean
  user: {
    name: string | null
    email: string
  }
}

export default function OrganizationSettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [orgName, setOrgName] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [invites, setInvites] = useState<OrganizationInvite[]>([])
  const [inviting, setInviting] = useState(false)
  const [selfServeInvites, setSelfServeInvites] = useState<SelfServeInvite[]>([])
  const [newSelfServeInvite, setNewSelfServeInvite] = useState({
    name: "",
    expiresAt: "",
    usageLimit: ""
  })
  const [creating, setCreating] = useState(false)
  const [showRemoveMemberDialog, setShowRemoveMemberDialog] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<{ id: string, name: string | null, email: string } | null>(null)
  const [showDeleteInviteDialog, setShowDeleteInviteDialog] = useState(false)
  const [inviteToDelete, setInviteToDelete] = useState<{ token: string, name: string } | null>(null)
  const router = useRouter()

  const fetchUserData = useCallback(async () => {
    try {
      const response = await fetch("/api/user")
      if (response.status === 401) {
        router.push("/auth/signin")
        return
      }

      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        setOrgName(userData.organization?.name || "")
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchUserData()
    fetchInvites()
    fetchSelfServeInvites()
  }, [fetchUserData])

  const fetchInvites = async () => {
    try {
      const response = await fetch("/api/organization/invites")
      if (response.ok) {
        const data = await response.json()
        setInvites(data.invites || [])
      }
    } catch (error) {
      console.error("Error fetching invites:", error)
    }
  }

  const fetchSelfServeInvites = async () => {
    try {
      const response = await fetch("/api/organization/self-serve-invites")
      if (response.ok) {
        const data = await response.json()
        setSelfServeInvites(data.selfServeInvites || [])
      }
    } catch (error) {
      console.error("Error fetching self-serve invites:", error)
    }
  }

  const handleSaveOrganization = async () => {
    setSaving(true)
    try {
      const response = await fetch("/api/organization", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: orgName,
        }),
      })

      if (response.ok) {
        const updatedUser = await response.json()
        setUser(updatedUser)
        toast.success("Organization updated successfully", {
          description: "Your organization settings have been saved."
        })
      } else {
        const errorData = await response.json()
        toast.error("Failed to update organization", {
          description: errorData.error || "Please try again or contact support if the problem persists."
        })
      }
    } catch (error) {
      console.error("Error updating organization:", error)
      toast.error("Failed to update organization", {
        description: "Please check your connection and try again."
      })
    } finally {
      setSaving(false)
    }
  }

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    setInviting(true)
    try {
      const response = await fetch("/api/organization/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: inviteEmail,
        }),
      })

      if (response.ok) {
        setInviteEmail("")
        fetchInvites()
        toast.success("Invitation sent successfully", {
          description: `An invite has been sent to ${inviteEmail}`
        })
      } else {
        const errorData = await response.json()
        toast.error("Failed to send invite", {
          description: errorData.error || "Please try again or contact support if the problem persists."
        })
      }
    } catch (error) {
      console.error("Error inviting member:", error)
      toast.error("Failed to send invite", {
        description: "Please check your connection and try again."
      })
    } finally {
      setInviting(false)
    }
  }

  const handleRemoveMember = async () => {
    if (!memberToRemove) return

    try {
      const response = await fetch(`/api/organization/members/${memberToRemove.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchUserData()
        toast.success("Team member removed successfully", {
          description: `${memberToRemove.name || memberToRemove.email || 'Member'} has been removed from the organization.`
        })
      } else {
        const errorData = await response.json()
        toast.error("Failed to remove member", {
          description: errorData.error || "Please try again or contact support if the problem persists."
        })
      }
    } catch (error) {
      console.error("Error removing member:", error)
      toast.error("Failed to remove member", {
        description: "Please check your connection and try again."
      })
    } finally {
      setShowRemoveMemberDialog(false)
      setMemberToRemove(null)
    }
  }

  const openRemoveMemberDialog = (member: { id: string, name: string | null, email: string }) => {
    setMemberToRemove(member)
    setShowRemoveMemberDialog(true)
  }

  const handleCancelInvite = async (inviteId: string) => {
    try {
      const response = await fetch(`/api/organization/invites/${inviteId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchInvites()
      }
    } catch (error) {
      console.error("Error canceling invite:", error)
    }
  }

  const handleToggleAdmin = async (memberId: string, currentAdminStatus: boolean) => {
    const member = user?.organization?.members.find(m => m.id === memberId)
    const newStatus = !currentAdminStatus

    try {
      const response = await fetch(`/api/organization/members/${memberId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isAdmin: newStatus,
        }),
      })

      if (response.ok) {
        fetchUserData() // Refresh the data to show updated admin status
        toast.success(`Admin status updated successfully`, {
          description: `${member?.name || member?.email || 'Member'} ${newStatus ? 'is now an admin' : 'is no longer an admin'}.`
        })
      } else {
        const errorData = await response.json()
        toast.error("Failed to update admin status", {
          description: errorData.error || "Please try again or contact support if the problem persists."
        })
      }
    } catch (error) {
      console.error("Error toggling admin status:", error)
      toast.error("Failed to update admin status", {
        description: "Please check your connection and try again."
      })
    }
  }

  const handleCreateSelfServeInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSelfServeInvite.name.trim()) return

    setCreating(true)
    try {
      const payload: {
        name: string
        expiresAt?: string
        usageLimit?: number
      } = {
        name: newSelfServeInvite.name,
      }

      if (newSelfServeInvite.expiresAt) {
        // Send the date as YYYY-MM-DD format
        payload.expiresAt = newSelfServeInvite.expiresAt
      }

      if (newSelfServeInvite.usageLimit) {
        const limit = parseInt(newSelfServeInvite.usageLimit)
        if (!isNaN(limit) && limit > 0) {
          payload.usageLimit = limit
        }
      }

      const response = await fetch("/api/organization/self-serve-invites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        setNewSelfServeInvite({ name: "", expiresAt: "", usageLimit: "" })
        fetchSelfServeInvites()
        toast.success("Invite link created successfully", {
          description: `"${newSelfServeInvite.name}" invite link is ready to share.`
        })
      } else {
        const errorData = await response.json()
        toast.error("Failed to create invite link", {
          description: errorData.error || "Please try again or contact support if the problem persists."
        })
      }
    } catch (error) {
      console.error("Error creating self-serve invite:", error)
      toast.error("Failed to create invite link", {
        description: "Please check your connection and try again."
      })
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteSelfServeInvite = async () => {
    if (!inviteToDelete) return

    try {
      const response = await fetch(`/api/organization/self-serve-invites/${inviteToDelete.token}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchSelfServeInvites()
        toast.success("Invite link deleted successfully", {
          description: `"${inviteToDelete.name}" invite link has been permanently removed.`
        })
      } else {
        const errorData = await response.json()
        toast.error("Failed to delete invite link", {
          description: errorData.error || "Please try again or contact support if the problem persists."
        })
      }
    } catch (error) {
      console.error("Error deleting self-serve invite:", error)
      toast.error("Failed to delete invite link", {
        description: "Please check your connection and try again."
      })
    } finally {
      setShowDeleteInviteDialog(false)
      setInviteToDelete(null)
    }
  }

  const openDeleteInviteDialog = (invite: { token: string, name: string }) => {
    setInviteToDelete(invite)
    setShowDeleteInviteDialog(true)
  }

  const copyInviteLink = async (inviteToken: string) => {
    const inviteUrl = `${window.location.origin}/join/${inviteToken}`
    try {
      await navigator.clipboard.writeText(inviteUrl)
      toast.success("Invite link copied!", {
        description: "The invite link has been copied to your clipboard."
      })
    } catch (error) {
      console.error("Failed to copy link:", error)
      // Fallback for older browsers
      const textArea = document.createElement("textarea")
      textArea.value = inviteUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      toast.success("Invite link copied!", {
        description: "The invite link has been copied to your clipboard."
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Organization Info */}
      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Organization Settings</h2>
            <p className="text-gray-600">Manage your organization and team members.</p>
          </div>

          <div>
            <Label htmlFor="orgName">Organization Name</Label>
            <Input
              id="orgName"
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Enter organization name"
              className="mt-1"
              disabled={!user?.isAdmin}
            />
          </div>

          <div className="pt-4 border-t">
            <Button
              onClick={handleSaveOrganization}
              disabled={saving || orgName === user?.organization?.name || !user?.isAdmin}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              title={!user?.isAdmin ? "Only admins can update organization settings" : undefined}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Team Members */}
      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Team Members</h3>
            <p className="text-gray-600">
              {user?.isAdmin
                ? `Manage your organization's team members.`
                : `View your organization's team members.`
              }
            </p>
          </div>

          <div className="space-y-3">
            {user?.organization?.members?.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 ${member.isAdmin ? 'bg-purple-500' : 'bg-blue-500'} rounded-full flex items-center justify-center`}>
                    <span className="text-white font-medium">
                      {member.name ? member.name.charAt(0).toUpperCase() : member.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-gray-900">{member.name || "Unnamed User"}</p>
                      {member.isAdmin && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          <ShieldCheck className="w-3 h-3 mr-1" />
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {/* Only show admin toggle to current admins and not for yourself */}
                  {user?.isAdmin && member.id !== user.id && (
                    <Button
                      onClick={() => handleToggleAdmin(member.id, member.isAdmin)}
                      variant="outline"
                      size="sm"
                      className={`${member.isAdmin
                        ? 'text-purple-600 hover:text-purple-700 hover:bg-purple-50'
                        : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
                        }`}
                      title={member.isAdmin ? "Remove admin role" : "Make admin"}
                    >
                      {member.isAdmin ? <ShieldCheck className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                    </Button>
                  )}
                  {user?.isAdmin && member.id !== user.id && (
                    <Button
                      onClick={() => openRemoveMemberDialog(member)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Invite Members */}
      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Invite Team Members</h3>
            <p className="text-gray-600">Send invitations to new team members.</p>
          </div>

          <form onSubmit={handleInviteMember} className="flex space-x-4">
            <div className="flex-1">
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Enter email address"
                required
                disabled={!user?.isAdmin}
              />
            </div>
            <Button
              type="submit"
              disabled={inviting || !user?.isAdmin}
              className="disabled:bg-gray-400 disabled:cursor-not-allowed"
              title={!user?.isAdmin ? "Only admins can invite new team members" : undefined}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {inviting ? "Inviting..." : "Send Invite"}
            </Button>
          </form>

          {/* Pending Invites */}
          {invites.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Pending Invites</h4>
              {invites.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div>
                    <p className="font-medium text-gray-900">{invite.email}</p>
                    <p className="text-sm text-gray-500">
                      Invited on {new Date(invite.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleCancelInvite(invite.id)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    Cancel
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Self-Serve Invite Links */}
      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Self-Serve Invite Links</h3>
            <p className="text-gray-600">Create shareable links that allow anyone to join your organization.</p>
          </div>

          {/* Create New Self-Serve Invite */}
          <form onSubmit={handleCreateSelfServeInvite} className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="inviteName">Invite Name</Label>
                <Input
                  id="inviteName"
                  type="text"
                  value={newSelfServeInvite.name}
                  onChange={(e) => setNewSelfServeInvite(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., General Invite"
                  required
                  disabled={!user?.isAdmin}
                />
              </div>
              <div>
                <Label htmlFor="expiresAt">Expires (Optional)</Label>
                <Input
                  id="expiresAt"
                  type="date"
                  value={newSelfServeInvite.expiresAt}
                  onChange={(e) => setNewSelfServeInvite(prev => ({ ...prev, expiresAt: e.target.value }))}
                  disabled={!user?.isAdmin}
                />
              </div>
              <div>
                <Label htmlFor="usageLimit">Usage Limit (Optional)</Label>
                <Input
                  id="usageLimit"
                  type="number"
                  min="1"
                  value={newSelfServeInvite.usageLimit}
                  onChange={(e) => setNewSelfServeInvite(prev => ({ ...prev, usageLimit: e.target.value }))}
                  placeholder="Unlimited"
                  disabled={!user?.isAdmin}
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={creating || !user?.isAdmin}
              className="disabled:bg-gray-400 disabled:cursor-not-allowed"
              title={!user?.isAdmin ? "Only admins can create invite links" : undefined}
            >
              <Link className="w-4 h-4 mr-2" />
              {creating ? "Creating..." : "Create Invite Link"}
            </Button>
          </form>

          {/* Active Self-Serve Invites */}
          {selfServeInvites.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Active Invite Links</h4>
              {selfServeInvites.map((invite) => (
                <div key={invite.id} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h5 className="font-medium text-gray-900">{invite.name}</h5>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center">
                            <Users className="w-4 h-4 mr-1" />
                            {invite.usageLimit ? `${invite.usageCount}/${invite.usageLimit} used` : `${invite.usageCount} joined`}
                          </span>
                          {invite.expiresAt && (
                            <span className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              Expires {new Date(invite.expiresAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <p>Created by {invite.user.name || invite.user.email} on {new Date(invite.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="mt-3 p-2 bg-white rounded border">
                        <code className="text-sm text-gray-700 break-all">
                          {typeof window !== 'undefined' ? `${window.location.origin}/join/${invite.token}` : `/join/${invite.token}`}
                        </code>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        onClick={() => copyInviteLink(invite.token)}
                        variant="outline"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="Copy invite link"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      {user?.isAdmin && (
                        <Button
                          onClick={() => openDeleteInviteDialog({ token: invite.token, name: invite.name })}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Delete invite link"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selfServeInvites.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Link className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No self-serve invite links created yet.</p>
              <p className="text-sm">Create a link above to allow anyone to join your organization.</p>
            </div>
          )}
        </div>
      </Card>

      {/* Remove Member Confirmation Dialog */}
      <AlertDialog open={showRemoveMemberDialog} onOpenChange={setShowRemoveMemberDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{memberToRemove?.name || memberToRemove?.email}</strong> from your organization?
              This action cannot be undone and they will lose access to all boards and content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMemberToRemove(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Invite Link Confirmation Dialog */}
      <AlertDialog open={showDeleteInviteDialog} onOpenChange={setShowDeleteInviteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invite Link</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the <strong>&quot;{inviteToDelete?.name}&quot;</strong> invite link?
              This action cannot be undone and the link will no longer work for new members.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setInviteToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSelfServeInvite}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete Link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 