  "use client";

  import { useState, useEffect } from "react";
  import { Button } from "@/components/ui/button";
  import { Card } from "@/components/ui/card";
  import { Input } from "@/components/ui/input";
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
  import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
  import { useRouter } from "next/navigation";
  import { SLACK_WEBHOOK_REGEX } from "@/lib/constants";
  import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
  import { z } from "zod";
  import { useForm } from "react-hook-form";
  import { zodResolver } from "@hookform/resolvers/zod";
  import { toast } from "sonner";

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

  const organizationSettingFormSchema = z.object({
    name: z
      .string().min(1, "Organization name is required"),
    
    slackWebhookUrl:  z.union([
        z.literal(""), // allow empty string
        z.string().regex(SLACK_WEBHOOK_REGEX, "Invalid Slack webhook URL"),
      ])
  })

  const inviteFormSchema = z.object({
    email: z.string().email("Invalid email address"),
  })

  const selfServeInviteFormSchema = z.object({
    name: z.string().min(1, "Invite name is required"),
    expiresAt: z.string().optional(),
    usageLimit: z.coerce.number().min(1).optional(),
  })

  export default function OrganizationSettingsPage() {
    const { user, loading, refreshUser } = useUser();
    const router = useRouter();
    const [invites, setInvites] = useState<OrganizationInvite[]>([]);
    const [selfServeInvites, setSelfServeInvites] = useState<SelfServeInvite[]>([]);
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

    const inviteForm = useForm<z.infer<typeof inviteFormSchema>>({
      resolver: zodResolver(inviteFormSchema),
      defaultValues: { email: "" },
    });

    const organizationSettingForm = useForm<z.infer<typeof organizationSettingFormSchema>>({
      resolver: zodResolver(organizationSettingFormSchema),
      defaultValues: { name: "", slackWebhookUrl: "" },
    });

    const selfServeInviteForm = useForm<z.infer<typeof selfServeInviteFormSchema>>({
      resolver: zodResolver(selfServeInviteFormSchema),
      defaultValues: { name: "", expiresAt: "", usageLimit: undefined },
    });

    const slackWebhookValue = organizationSettingForm.watch("slackWebhookUrl");
    const organizationNameValue = organizationSettingForm.watch("name");

    useEffect(() => {
      if (user?.organization) {
        organizationSettingForm.reset({
          name: user.organization.name || "",
          slackWebhookUrl: user.organization.slackWebhookUrl || "",
        });
      }
    }, [user?.organization, organizationSettingForm]);

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

    const handleSaveOrganization = async (values: z.infer<typeof organizationSettingFormSchema>) => {
      try {
        const response = await fetch("/api/organization", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: values.name,
            slackWebhookUrl: values.slackWebhookUrl,
          }),
        });

        if (response.ok) {
          refreshUser();
          toast.success("Organization settings saved successfully.");
          organizationSettingForm.reset(values);
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
      }
    };

    const handleInviteMember = async (values: z.infer<typeof inviteFormSchema>) => {
      if (!user?.isAdmin) return

      try {
        const response = await fetch("/api/organization/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: values.email }),
        })

        if (response.ok) {
          inviteForm.reset()
          fetchInvites()
          toast.success("Invite sent successfully")
        } else {
          const errorData = await response.json()
          setErrorDialog({
            open: true,
            title: "Failed to send invite",
            description: errorData.error || "Failed to send invite",
          })
        }
      } catch (error) {
        console.error("Error inviting member:", error)
        setErrorDialog({
          open: true,
          title: "Failed to send invite",
          description: "Something went wrong while sending the invite",
        })
      }
    }

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

    const handleCreateSelfServeInvite = async (values: z.infer<typeof selfServeInviteFormSchema>) => {
    if (!user?.isAdmin) return;

    try {
      const payload = {
        name: values.name,
        expiresAt: values.expiresAt,
        usageLimit: values.usageLimit,
      }

      console.log(payload);
      

      const response = await fetch("/api/organization/self-serve-invites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      console.log(await response.json());
      

      if (response.ok) {
        selfServeInviteForm.reset();
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
        <Card className="p-4 lg:p-6 bg-white dark:bg-black border border-gray-200 dark:border-zinc-800">
          <div className="space-y-3 lg:space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Organization Settings
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                Manage your organization and team members.
              </p>
            </div>

            <Form {...organizationSettingForm}>
              <form onSubmit={organizationSettingForm.handleSubmit(handleSaveOrganization)}>
                <FormField 
                  name="name"
                  control={organizationSettingForm.control}
                  render={({  field }) => (
                    <FormItem>
                      <FormLabel>Organization Name</FormLabel>
                      <FormControl>
                        <Input
                           id="organizationName"
                        placeholder="Enter organization name" {...field} />
                      </FormControl>
                      <FormMessage className="text-red-500 dark:text-red-400" />
                    </FormItem>
                  )}
                />

                <div className="my-4 border-t border-zinc-200 dark:border-zinc-800" />
                    <Button 
                    type="submit" 
                    disabled={organizationSettingForm.formState.isSubmitting || 
                              !user?.isAdmin ||
                              organizationNameValue === user?.organization?.name 
                    }>
                        <span>{organizationSettingForm.formState.isSubmitting ? "Saving..." : "Save Changes"}</span>
                    </Button>
              </form>
            </Form>

          </div>
        </Card>

        {/* Slack Integration */}
        <Card className="p-4 lg:p-6 bg-white dark:bg-black border border-gray-200 dark:border-zinc-800">
          <div className="space-y-3 lg:space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Slack Integration
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Configure Slack notifications for notes and todos.
              </p>
            </div>


            <Form {...organizationSettingForm}>
              <form onSubmit={organizationSettingForm.handleSubmit(handleSaveOrganization)}>
                <FormField 
                  name="slackWebhookUrl"
                  control={organizationSettingForm.control}
                  render={({  field }) => (
                    <FormItem>
                      <FormLabel>Slack Webhook URL</FormLabel>
                      <FormControl>
                        <Input 
                          id="slackWebhookUrl"
                          disabled={!user?.isAdmin} 
                          placeholder="https://hooks.slack.com/services/..." {...field} />
                      </FormControl>
                      <FormMessage className="text-red-500 dark:text-red-400" />
                    </FormItem>
                  )}
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

                <div className="my-4 border-t border-zinc-200 dark:border-zinc-800" />
                    <Button
                    title={!user?.isAdmin ? "Only admins can update organization settings" : undefined}
                    type="submit" 
                    disabled={organizationSettingForm.formState.isSubmitting 
                              || !user?.isAdmin 
                              || slackWebhookValue === user?.organization?.slackWebhookUrl
                          }>
                        <span>{organizationSettingForm.formState.isSubmitting ? "Saving..." : "Save Changes"}</span>
                    </Button>
              </form>
            </Form>
          </div>
        </Card>

        {/* Team Members */}
        <Card className="p-4 lg:p-6 bg-white dark:bg-black border border-gray-200 dark:border-zinc-800">
          <div className="space-y-3 lg:space-y-6">
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
                  className="flex items-center justify-between p-2 lg:p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={member.image || ""} alt={member.name || member.email} />
                      <AvatarFallback
                        className={
                          member.isAdmin ? "bg-purple-500" : "bg-blue-500 dark:bg-zinc-700 text-white"
                        }
                      >
                        {member.name
                          ? member.name.charAt(0).toUpperCase()
                          : member.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
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
        <Card className="p-4 lg:p-6 bg-white dark:bg-black border border-gray-200 dark:border-zinc-800">
          <div className="space-y-3 lg:space-y-6">
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
              {inviting ? (
                "Inviting..."
              ) : (
                <>
                  <span className="hidden lg:inline">Send</span>Invite
                </>
              )}
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
                      id="cancel-invite"
                      size="sm"
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900 border-red-600 hover:bg-inherit hover:border-red-600"
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
        <Card className="p-4 lg:p-6 bg-white dark:bg-black border border-gray-200 dark:border-zinc-800">
          <div className="space-y-3 lg:space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Self-Serve Invite Links
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Create shareable links that allow anyone to join your organization.
              </p>
            </div>

            {/* Create New Self-Serve Invite */}
            <Form {...selfServeInviteForm}>
                <form onSubmit={selfServeInviteForm.handleSubmit(handleCreateSelfServeInvite)}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={selfServeInviteForm.control}
                      name="name"
                      render={({field}) => (
                        <FormItem>
                          <FormLabel>Invite Name</FormLabel>
                          <FormControl>
                            <Input 
                              id="self-serve-invite-name-input"
                              type="text"
                              placeholder="e.g., General Invite"
                              {...field}
                            />
                          </FormControl>
                          <div className="min-h-[1rem]">

                          <FormMessage className="text-red-500 dark:text-red-400" />
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField 
                      control={selfServeInviteForm.control}
                      name="expiresAt"
                     
                      render={({field}) => (
                        <FormItem>
                          <FormLabel>Expires (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                             id="self-serve-invite-expires-input"
                              className="py-0"
                              type="date"
                              min={new Date().toISOString().split("T")[0]}
                              {...field}
                            />
                          </FormControl>
                           <div className="min-h-[1rem]">

                          <FormMessage className="text-red-500 dark:text-red-400" />
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField 
                      control={selfServeInviteForm.control}
                      name="usageLimit"
                      render={({field}) => (
                        <FormItem>
                          <FormLabel>Usage Limit (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              id="self-serve-invite-usage-limit-input"
                              placeholder="Unlimited"
                              type="number"
                              {...field}
                            />
                          </FormControl>
                          <div className="min-h-[1rem]">

                          <FormMessage className="text-red-500 dark:text-red-400" />
                          </div>
                        </FormItem>
                      )}
                    />
                    </div>
                    <Button id="create-self-serve-invite" className="mt-2" type="submit" disabled={!user?.isAdmin || selfServeInviteForm.formState.isSubmitting }>
                         <Link className="w-4 h-4 mr-1" />
                        <span>{selfServeInviteForm.formState.isSubmitting ? "Creating..." : "Create Invite Link"}</span>
                    </Button>
                </form>
            </Form>

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
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <h5 className="font-medium text-zinc-900 dark:text-zinc-100">
                              {invite.name}
                            </h5>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              Active
                            </span>
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
                        <div className="w-fit mt-3 p-2 bg-white dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-700">
                          <code className="text-sm text-zinc-700 dark:text-zinc-200 break-all">
                            {typeof window !== "undefined"
                              ? `${window.location.origin}/join/${invite.token}`
                              : `/join/${invite.token}`}
                          </code>
                        </div>
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
              <AlertDialogCancel>Cancel</AlertDialogCancel>
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
              <AlertDialogCancel>Cancel</AlertDialogCancel>
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
