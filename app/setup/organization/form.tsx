"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUser } from "@/app/contexts/UserContext";
import { invitesAllowedForPlan, FREE_INVITES_LIMIT } from "@/lib/billing";

interface OrganizationSetupFormProps {
  onSubmit: (
    orgName: string,
    teamEmails: string[]
  ) => Promise<{ success: boolean; organization?: { id: string } }>;
}

export default function OrganizationSetupForm({ onSubmit }: OrganizationSetupFormProps) {
  const [orgName, setOrgName] = useState("");
  const [teamEmails, setTeamEmails] = useState<string[]>([""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [atInviteLimit, setAtInviteLimit] = useState(false);

  const router = useRouter();
  const { refreshUser } = useUser();

  // FREE during setup; owner not counted. 2 invites allowed.
  const INVITES_LIMIT = invitesAllowedForPlan("FREE");

  // Valid emails (for banner + submit).
  const validEmails = teamEmails.filter((email) => email.trim() && email.includes("@"));

  const addEmailField = () => {
    if (teamEmails.length >= INVITES_LIMIT) {
      setAtInviteLimit(true);
    } else {
      setTeamEmails((prev) => [...prev, ""]);
    }
  };

  const removeEmailField = (index: number) => {
    setTeamEmails((prev) => prev.filter((_, i) => i !== index));
  };

  const updateEmail = (index: number, value: string) => {
    setTeamEmails((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) return;

    setIsSubmitting(true);
    try {
      const validEmails = teamEmails.filter((email) => email.trim() && email.includes("@"));
      const result = await onSubmit(orgName.trim(), validEmails);
      if (result?.success) {
        await refreshUser();
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error creating organization:", error);
      setIsSubmitting(false);
    }
  };

  const hasAnyValidEmail = validEmails.length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 dark:text-zinc-400">
      <div className="space-y-2">
        <Label htmlFor="organizationName">Organization Name</Label>
        <Input
          id="organizationName"
          type="text"
          placeholder="Enter your organization name"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          required
          className="w-full"
        />
      </div>

      <div className="space-y-4">
        <Label>Team Member Email Addresses</Label>

        <div className="space-y-3">
          {teamEmails.map((email, index) => (
            <div key={index} className="flex gap-2">
              <Input
                type="email"
                placeholder="teammate@company.com"
                value={email}
                onChange={(e) => updateEmail(index, e.target.value)}
                className="flex-1"
              />
              {teamEmails.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removeEmailField(index)}
                  className="shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {atInviteLimit ? (
          <div
            className="flex items-center justify-between rounded-lg border p-3"
            data-testid="upgrade-banner"
          >
            <span className="text-sm">Free plan: {FREE_INVITES_LIMIT} team member limit</span>
            <Button size="sm" onClick={() => router.push("/pricing")} data-testid="upgrade-cta">
              Upgrade
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={addEmailField}
            className="w-full"
            data-testid="invite-add-btn"
            disabled={atInviteLimit} // cap number of inputs to the limit
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Team Member
          </Button>
        )}

        <p className="text-xs text-muted-foreground">
          {"we'll send invitations to join your organization to these email addresses."}
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : hasAnyValidEmail ? "Save & Send Invites" : "Save"}
      </Button>
    </form>
  );
}
