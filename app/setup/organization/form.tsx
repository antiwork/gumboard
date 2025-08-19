"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUser } from "@/app/contexts/UserContext";
import { FREE_CAP } from "@/lib/billing";

interface OrganizationSetupFormProps {
  onSubmit: (
    orgName: string,
    teamEmails: string[]
  ) => Promise<{ success: boolean; organization?: unknown }>;
  onUpgrade: (orgName: string, teamEmails: string[]) => Promise<{ url?: string | null }>;
}

export default function OrganizationSetupForm({ onSubmit, onUpgrade }: OrganizationSetupFormProps) {
  const [orgName, setOrgName] = useState("");
  const [teamEmails, setTeamEmails] = useState<string[]>([""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { refreshUser } = useUser();

  const addEmailField = () => {
    // Free onboarding goal: allow up to FREE_CAP total emails (owner + teammates) before upgrade
    if (teamEmails.length >= FREE_CAP) return;
    setTeamEmails([...teamEmails, ""]);
  };

  const removeEmailField = (index: number) => {
    if (teamEmails.length > 1) {
      setTeamEmails(teamEmails.filter((_, i) => i !== index));
    }
  };

  const updateEmail = (index: number, value: string) => {
    const updated = [...teamEmails];
    updated[index] = value;
    setTeamEmails(updated);
  };

  const hasValidEmails = () => {
    return teamEmails.filter((email) => email.trim() && email.includes("@")).length > 0;
  };

    const handleUpgrade = async () => {
    if (!orgName.trim()) {
      alert("Please enter an organization name first.");
      return;
    }
    setIsSubmitting(true);
    try {
      const validEmails = teamEmails.filter((email) => email.trim() && email.includes("@"));
      const result = await onUpgrade(orgName.trim(), validEmails);
      if (result?.url) {
        window.location.href = result.url;
      } else {
        throw new Error("Could not create checkout session");
      }
    } catch (error) {
      console.error("Error starting upgrade process:", error);
      setIsSubmitting(false);
    }
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

                        <Button type="button" variant="outline" onClick={addEmailField} className="w-full" disabled={teamEmails.length >= FREE_CAP}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Team Member
                </Button>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>{`we'll send invitations to join your organization to these email addresses.`}</p>
          {teamEmails.length >= 2 && (
            <div className="text-orange-600 dark:text-orange-400">
              Free plan allows up to {FREE_CAP} members. Add more by
              {" "}
              <button
                type="button"
                onClick={handleUpgrade}
                disabled={isSubmitting}
                className="underline text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
              >
                upgrading here
              </button>
              .
            </div>
          )}
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : hasValidEmails() ? "Save & Send Invites" : "Save"}
      </Button>
    </form>
  );
}
