"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Trash2,
  UserPlus,
  Shield,
  ShieldCheck,
  Link,
  Copy,
  Calendar,
  Users,
  ExternalLink,
} from "lucide-react";
import { Loader } from "@/components/ui/loader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useUser } from "@/app/contexts/UserContext";
import { useRouter } from "next/navigation";

interface OrganizationInvite {
  id: string;
  email: string;
  status: string;
  createdAt: string;
}

interface SelfServeInvite {
  id: string;
  token: string;
  name: string;
  createdAt: string;
  expiresAt: string | null;
  usageLimit: number | null;
  usageCount: number;
  isActive: boolean;
  user: {
    name: string | null;
    email: string;
  };
}

export default function OrganizationSettingsPage() {
  const { user, loading, refreshUser } = useUser();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [originalOrgName, setOriginalOrgName] = useState("");
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const [originalSlackWebhookUrl, setOriginalSlackWebhookUrl] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invites, setInvites] = useState<OrganizationInvite[]>([]);
  const [inviting, setInviting] = useState(false);
  const [selfServeInvites, setSelfServeInvites] = useState<SelfServeInvite[]>([]);
  const [newSelfServeInvite, setNewSelfServeInvite] = useState({
    name: "",
    expiresAt: "",
    usageLimit: "",
  });
  const [removeMemberDialog, setRemoveMemberDialog] = useState<{
    open: boolean;
    memberId: string;
    memberName: string;
  }>({ open: false, memberId: "", memberName: "" });
  const [deleteInviteDialog, setDeleteInviteDialog] = useState<{
    open: boolean;
    inviteToken: string;
    inviteName: string;
  }>({ open: false, inviteToken: "", inviteName: "" });
  const [errorDialog, setErrorDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    variant?: "default" | "success" | "error";
  }>({ open: false, title: "", description: "", variant: "error" });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user?.organization) {
      const orgNameValue = user.organization.name || "";
      const slackWebhookValue = user.organization.slackWebhookUrl || "";
      setOrgName(orgNameValue);
      setOriginalOrgName(orgNameValue);
      setSlackWebhookUrl(slackWebhookValue);
      setOriginalSlackWebhookUrl(slackWebhookValue);
    }
  }, [user?.organization?.name, user?.organization?.slackWebhookUrl]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/signin");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.organization) {
      fetchInvites();
      fetchSelfServeInvites();
    }
  }, [user?.organization]);

  const fetchInvites = async () => {
    try {
      const response = await fetch("/api/organization/invites");
      if (response.ok) {
        const data = await response.json();
        setInvites(data.invites || []);
      }
    } catch (error) {
      console.error("Error fetching invites:", error);
    }
  };

  const fetchSelfServeInvites = async () => {
    try {
      const response = await fetch("/api/organization/self-serve-invites");
      if (response.ok) {
        const data = await response.json();
        setSelfServeInvites(data.selfServeInvites || []);
      }
    } catch (error) {
      console.error("Error fetching self-serve invites:", error);
    }
  };

  const handleSaveOrganization = async () => {
    setSaving(true);
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
      });

      if (response.ok) {
        // Update the original values to reflect the saved state
        setOriginalOrgName(orgName);
        setOriginalSlackWebhookUrl(slackWebhookUrl);
        refreshUser();
      } else {
        const errorData = await response.json();
        setErrorDialog({
          open: true,
          title: "Failed to update organization",
          description: errorData.error || "Failed to update organization",
        });
      }
    } catch (error) {
      console.error("Error updating organization:", error);
      setErrorDialog({
        open: true,
        title: "Failed to update organization",
        description: "Failed to update organization",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    try {
      const response = await fetch("/api/organization/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: inviteEmail,
        }),
      });

      if (response.ok) {
        setInviteEmail("");
        fetchInvites();
      } else {
        const errorData = await response.json();
        setErrorDialog({
          open: true,
          title: "Failed to send invite",
          description: errorData.error || "Failed to send invite",
        });
      }
    } catch (error) {
      console.error("Error inviting member:", error);
      setErrorDialog({
        open: true,
        title: "Failed to send invite",
        description: "Failed to send invite",
      });
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    setRemoveMemberDialog({
      open: true,
      memberId,
      memberName,
    });
  };

  const confirmRemoveMember = async () => {
    try {
      const response = await fetch(`/api/organization/members/${removeMemberDialog.memberId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await refreshUser();
      } else {
        const errorData = await response.json();
        setErrorDialog({
          open: true,
          title: "Failed to remove member",
          description: errorData.error || "Failed to remove member",
        });
      }
    } catch (error) {
      console.error("Error removing member:", error);
      setErrorDialog({
        open: true,
        title: "Failed to remove member",
        description: "Failed to remove member",
      });
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      const response = await fetch(`/api/organization/invites/${inviteId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchInvites();
      }
    } catch (error) {
      console.error("Error canceling invite:", error);
    }
  };

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
      });

      if (response.ok) {
        await refreshUser();
      } else {
        const errorData = await response.json();
        setErrorDialog({
          open: true,
          title: "Failed to update admin status",
          description: errorData.error || "Failed to update admin status",
        });
      }
    } catch (error) {
      console.error("Error toggling admin status:", error);
      setErrorDialog({
        open: true,
        title: "Failed to update admin status",
        description: "Failed to update admin status",
      });
    }
  };

  const handleCreateSelfServeInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSelfServeInvite.name.trim()) return;

    setCreating(true);
    try {
      const payload: {
        name: string;
        expiresAt?: string;
        usageLimit?: number;
      } = {
        name: newSelfServeInvite.name,
      };

      if (newSelfServeInvite.expiresAt) {
        // Send the date as YYYY-MM-DD format
        payload.expiresAt = newSelfServeInvite.expiresAt;
      }

      if (newSelfServeInvite.usageLimit) {
        const limit = parseInt(newSelfServeInvite.usageLimit);
        if (!isNaN(limit) && limit > 0) {
          payload.usageLimit = limit;
        }
      }

      const response = await fetch("/api/organization/self-serve-invites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setNewSelfServeInvite({ name: "", expiresAt: "", usageLimit: "" });
        fetchSelfServeInvites();
      } else {
        const errorData = await response.json();
        setErrorDialog({
          open: true,
          title: "Failed to create invite link",
          description: errorData.error || "Failed to create invite link",
        });
      }
    } catch (error) {
      console.error("Error creating self-serve invite:", error);
      setErrorDialog({
        open: true,
        title: "Failed to create invite link",
        description: "Failed to create invite link",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteSelfServeInvite = (inviteToken: string, inviteName: string) => {
    setDeleteInviteDialog({
      open: true,
      inviteToken,
      inviteName,
    });
  };

  const confirmDeleteSelfServeInvite = async () => {
    try {
      const response = await fetch(
        `/api/organization/self-serve-invites/${deleteInviteDialog.inviteToken}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        fetchSelfServeInvites();
      } else {
        const errorData = await response.json();
        setErrorDialog({
          open: true,
          title: "Failed to delete invite link",
          description: errorData.error || "Failed to delete invite link",
        });
      }
    } catch (error) {
      console.error("Error deleting self-serve invite:", error);
      setErrorDialog({
        open: true,
        title: "Failed to delete invite link",
        description: "Failed to delete invite link",
      });
    }
  };

  const copyInviteLink = async (inviteToken: string) => {
    const inviteUrl = `${window.location.origin}/join/${inviteToken}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setErrorDialog({
        open: true,
        title: "Success",
        description: "Invite link copied to clipboard!",
        variant: "success",
      });
    } catch (error) {
      console.error("Failed to copy link:", error);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = inviteUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setErrorDialog({
        open: true,
        title: "Success",
        description: "Invite link copied to clipboard!",
        variant: "success",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 bg-white dark:bg-black min-h-[60vh]">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 min-h-screen px-2 sm:px-0">
      {/* Organization Info */}
      <Card className="p-6 bg-white dark:bg-black border border-gray-200 dark:border-zinc-800">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Organization Settings
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              Manage your organization and team members.
            </p>
          </div>

          <div>
            <Label htmlFor="orgName" className="text-zinc-800 dark:text-zinc-200">
              Organization Name
            </Label>
            <Input
              id="orgName"
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Enter organization name"
              className="mt-1 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              disabled={!user?.isAdmin}
            />
          </div>

          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <Button
              onClick={handleSaveOrganization}
              disabled={saving || orgName === originalOrgName || !user?.isAdmin}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white dark:text-zinc-100"
              title={!user?.isAdmin ? "Only admins can update organization settings" : undefined}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Slack Integration */}
      <Card className="p-6 bg-white dark:bg-black border border-gray-200 dark:border-zinc-800">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Slack Integration
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Configure Slack notifications for notes and todos.
            </p>
          </div>

          <div>
            <Label htmlFor="slackWebhookUrl" className="text-zinc-800 dark:text-zinc-200">
              Slack Webhook URL
            </Label>
            <Input
              id="slackWebhookUrl"
              type="url"
              value={slackWebhookUrl}
              onChange={(e) => setSlackWebhookUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              className="mt-1 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              disabled={!user?.isAdmin}
            />
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Create a webhook URL in your Slack workspace to receive notifications when notes and
              todos are created or completed.{" "}
              <a
                href="https://api.slack.com/apps"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
              >
                Create Slack App
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </p>
          </div>

          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <Button
              onClick={handleSaveOrganization}
              disabled={saving || slackWebhookUrl === originalSlackWebhookUrl || !user?.isAdmin}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white dark:text-zinc-100"
              title={!user?.isAdmin ? "Only admins can update organization settings" : undefined}
            >
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Team Members */}
      <Card className="p-6 bg-white dark:bg-black border border-gray-200 dark:border-zinc-800">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Team Members
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              {user?.isAdmin
                ? `Manage your organization's team members.`
                : `View your organization's team members.`}
            </p>
          </div>

          <div className="space-y-3">
            {user?.organization?.members?.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-10 h-10 ${member.isAdmin ? "bg-purple-500" : "bg-blue-500 dark:bg-zinc-700"} rounded-full flex items-center justify-center`}
                  >
                    <span className="text-white font-medium">
                      {member.name
                        ? member.name.charAt(0).toUpperCase()
                        : member.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        {member.name || "Unnamed User"}
                      </p>
                      {member.isAdmin && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                          <ShieldCheck className="w-3 h-3 mr-1" />
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {/* Only show admin toggle to current admins and not for yourself */}
                  {user?.isAdmin && member.id !== user.id && (
                    <Button
                      onClick={() => handleToggleAdmin(member.id, !!member.isAdmin)}
                      variant="outline"
                      size="sm"
                      className={`${
                        member.isAdmin
                          ? "text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:text-purple-300 dark:hover:bg-purple-900"
                          : "text-zinc-500 dark:text-zinc-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:text-purple-300 dark:hover:bg-purple-900"
                      }`}
                      title={member.isAdmin ? "Remove admin role" : "Make admin"}
                    >
                      {member.isAdmin ? (
                        <ShieldCheck className="w-4 h-4" />
                      ) : (
                        <Shield className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                  {user?.isAdmin && member.id !== user.id && (
                    <Button
                      onClick={() => handleRemoveMember(member.id, member.name || member.email)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900"
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
      <Card className="p-6 bg-white dark:bg-black border border-gray-200 dark:border-zinc-800">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Invite Team Members
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Send invitations to new team members.
            </p>
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
                className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              />
            </div>
            <Button
              type="submit"
              disabled={inviting || !user?.isAdmin}
              className="disabled:bg-gray-400 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white dark:text-zinc-100"
              title={!user?.isAdmin ? "Only admins can invite new team members" : undefined}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {inviting ? "Inviting..." : "Send Invite"}
            </Button>
          </form>

          {/* Pending Invites */}
          {invites.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-zinc-900 dark:text-zinc-100">Pending Invites</h4>
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900 rounded-lg border border-yellow-200 dark:border-yellow-800"
                >
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">{invite.email}</p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Invited on {new Date(invite.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleCancelInvite(invite.id)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900"
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
      <Card className="p-6 bg-white dark:bg-black border border-gray-200 dark:border-zinc-800">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Self-Serve Invite Links
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Create shareable links that allow anyone to join your organization.
            </p>
          </div>

          {/* Create New Self-Serve Invite */}
          <form
            onSubmit={handleCreateSelfServeInvite}
            className="space-y-4 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="inviteName" className="text-zinc-800 dark:text-zinc-200 mb-2">
                  Invite Name
                </Label>
                <Input
                  id="inviteName"
                  type="text"
                  value={newSelfServeInvite.name}
                  onChange={(e) =>
                    setNewSelfServeInvite((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="e.g., General Invite"
                  required
                  disabled={!user?.isAdmin}
                  className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <Label htmlFor="expiresAt" className="text-zinc-800 dark:text-zinc-200 mb-2">
                  Expires (Optional)
                </Label>
                <Input
                  id="expiresAt"
                  type="date"
                  value={newSelfServeInvite.expiresAt}
                  onChange={(e) =>
                    setNewSelfServeInvite((prev) => ({
                      ...prev,
                      expiresAt: e.target.value,
                    }))
                  }
                  disabled={!user?.isAdmin}
                  className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <Label htmlFor="usageLimit" className="text-zinc-800 dark:text-zinc-200 mb-2">
                  Usage Limit (Optional)
                </Label>
                <Input
                  id="usageLimit"
                  type="number"
                  min="1"
                  value={newSelfServeInvite.usageLimit}
                  onChange={(e) =>
                    setNewSelfServeInvite((prev) => ({
                      ...prev,
                      usageLimit: e.target.value,
                    }))
                  }
                  placeholder="Unlimited"
                  disabled={!user?.isAdmin}
                  className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={creating || !user?.isAdmin}
              className="disabled:bg-gray-400 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white dark:text-zinc-100"
              title={!user?.isAdmin ? "Only admins can create invite links" : undefined}
            >
              <Link className="w-4 h-4 mr-2" />
              {creating ? "Creating..." : "Create Invite Link"}
            </Button>
          </form>

          {/* Active Self-Serve Invites */}
          {selfServeInvites.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-zinc-900 dark:text-zinc-100">Active Invite Links</h4>
              {selfServeInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="p-4 bg-blue-50 dark:bg-zinc-800 rounded-lg border border-blue-200 dark:border-zinc-700"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h5 className="font-medium text-zinc-900 dark:text-zinc-100">
                          {invite.name}
                        </h5>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Active
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center">
                            <Users className="w-4 h-4 mr-1" />
                            {invite.usageLimit
                              ? `${invite.usageCount}/${invite.usageLimit} used`
                              : `${invite.usageCount} joined`}
                          </span>
                          {invite.expiresAt && (
                            <span className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              Expires {new Date(invite.expiresAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <p>
                          Created by {invite.user.name || invite.user.email} on{" "}
                          {new Date(invite.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="mt-3 p-2 bg-white dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-700">
                        <code className="text-sm text-zinc-700 dark:text-zinc-200 break-all">
                          {typeof window !== "undefined"
                            ? `${window.location.origin}/join/${invite.token}`
                            : `/join/${invite.token}`}
                        </code>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        onClick={() => copyInviteLink(invite.token)}
                        variant="outline"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-zinc-800"
                        title="Copy invite link"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      {user?.isAdmin && (
                        <Button
                          onClick={() => handleDeleteSelfServeInvite(invite.token, invite.name)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900"
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
        </div>
      </Card>

      <AlertDialog
        open={removeMemberDialog.open}
        onOpenChange={(open) => setRemoveMemberDialog({ open, memberId: "", memberName: "" })}
      >
        <AlertDialogContent className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground dark:text-zinc-100">
              Remove team member
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground dark:text-zinc-400">
              Are you sure you want to remove {removeMemberDialog.memberName} from the team? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100 border border-gray-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveMember}
              className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700"
            >
              Remove member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteInviteDialog.open}
        onOpenChange={(open) => setDeleteInviteDialog({ open, inviteToken: "", inviteName: "" })}
      >
        <AlertDialogContent className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground dark:text-zinc-100">
              Delete invite link
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground dark:text-zinc-400">
              Are you sure you want to delete the invite link &quot;{deleteInviteDialog.inviteName}
              &quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100 border border-gray-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteSelfServeInvite}
              className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700"
            >
              Delete invite link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={errorDialog.open}
        onOpenChange={(open) =>
          setErrorDialog({ open, title: "", description: "", variant: "error" })
        }
      >
        <AlertDialogContent className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground dark:text-zinc-100">
              {errorDialog.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground dark:text-zinc-400">
              {errorDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() =>
                setErrorDialog({ open: false, title: "", description: "", variant: "error" })
              }
              className={
                errorDialog.variant === "success"
                  ? "bg-green-600 hover:bg-green-700 text-white dark:bg-green-600 dark:hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700"
              }
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
