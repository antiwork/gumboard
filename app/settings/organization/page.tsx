"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, UserPlus, Shield, ShieldCheck, Link, Copy, Calendar, Users } from "lucide-react"
import { Loader } from "@/components/ui/loader"

interface User {
  id: string
  name: string | null
  email: string
  isAdmin: boolean
  organization: {
    id: string
    name: string
    slackWebhookUrl?: string | null
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
  const [originalOrgName, setOriginalOrgName] = useState("")
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("")
  const [originalSlackWebhookUrl, setOriginalSlackWebhookUrl] = useState("")
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
        const orgNameValue = userData.organization?.name || ""
        const slackWebhookValue = userData.organization?.slackWebhookUrl || ""
        setOrgName(orgNameValue)
        setOriginalOrgName(orgNameValue)
        setSlackWebhookUrl(slackWebhookValue)
        setOriginalSlackWebhookUrl(slackWebhookValue)
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
          slackWebhookUrl: slackWebhookUrl,
        }),
      })

      if (response.ok) {
        const updatedUser = await response.json()
        setUser(updatedUser)
        // Update the original values to reflect the saved state
        setOriginalOrgName(orgName)
        setOriginalSlackWebhookUrl(slackWebhookUrl)
      } else {
        const errorData = await response.json()
        alert(errorData.error || "Failed to update organization")
      }
    } catch (error) {
      console.error("Error updating organization:", error)
      alert("Failed to update organization")
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
      } else {
        const errorData = await response.json()
        alert(errorData.error || "Failed to send invite")
      }
    } catch (error) {
      console.error("Error inviting member:", error)
      alert("Failed to send invite")
    } finally {
      setInviting(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this team member?")) return

    try {
      const response = await fetch(`/api/organization/members/${memberId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchUserData()
      } else {
        const errorData = await response.json()
        alert(errorData.error || "Failed to remove member")
      }
    } catch (error) {
      console.error("Error removing member:", error)
      alert("Failed to remove member")
    }
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
    try {
      const response = await fetch(`/api/organization/members/${memberId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isAdmin: !currentAdminStatus,
        }),
      })

      if (response.ok) {
        fetchUserData() // Refresh the data to show updated admin status
      } else {
        const errorData = await response.json()
        alert(errorData.error || "Failed to update admin status")
      }
    } catch (error) {
      console.error("Error toggling admin status:", error)
      alert("Failed to update admin status")
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
      } else {
        const errorData = await response.json()
        alert(errorData.error || "Failed to create invite link")
      }
    } catch (error) {
      console.error("Error creating self-serve invite:", error)
      alert("Failed to create invite link")
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteSelfServeInvite = async (inviteToken: string) => {
    if (!confirm("Are you sure you want to delete this invite link?")) return

    try {
      const response = await fetch(`/api/organization/self-serve-invites/${inviteToken}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchSelfServeInvites()
      } else {
        const errorData = await response.json()
        alert(errorData.error || "Failed to delete invite link")
      }
    } catch (error) {
      console.error("Error deleting self-serve invite:", error)
      alert("Failed to delete invite link")
    }
  }

  const copyInviteLink = async (inviteToken: string) => {
    const inviteUrl = `${window.location.origin}/join/${inviteToken}`
    try {
      await navigator.clipboard.writeText(inviteUrl)
      alert("Invite link copied to clipboard!")
    } catch (error) {
      console.error("Failed to copy link:", error)
      // Fallback for older browsers
      const textArea = document.createElement("textarea")
      textArea.value = inviteUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      alert("Invite link copied to clipboard!")
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
              disabled={saving || orgName === originalOrgName || !user?.isAdmin}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              title={!user?.isAdmin ? "Only admins can update organization settings" : undefined}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Slack Integration */}
      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Slack Integration</h3>
            <p className="text-gray-600">Configure Slack notifications for notes and todos.</p>
          </div>

          <div>
            <Label htmlFor="slackWebhookUrl">Slack Webhook URL</Label>
            <Input
              id="slackWebhookUrl"
              type="url"
              value={slackWebhookUrl}
              onChange={(e) => setSlackWebhookUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              className="mt-1"
              disabled={!user?.isAdmin}
            />
            <p className="text-sm text-gray-500 mt-1">
              Create a webhook URL in your Slack workspace to receive notifications when notes and todos are created or completed.
            </p>
          </div>

          <div className="pt-4 border-t">
            <Button 
              onClick={handleSaveOrganization}
              disabled={saving || slackWebhookUrl === originalSlackWebhookUrl || !user?.isAdmin}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              title={!user?.isAdmin ? "Only admins can update organization settings" : undefined}
            >
              {saving ? "Saving..." : "Save changes"}
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
                      className={`${
                        member.isAdmin 
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
                      onClick={() => handleRemoveMember(member.id)}
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
                          onClick={() => handleDeleteSelfServeInvite(invite.token)}
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
    </div>
  )
}    