"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { X, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUser } from "@/app/contexts/UserContext";

interface OrganizationSetupFormProps {
  onSubmit: (
    orgName: string,
    teamEmails: string[],
    shareAllBoardsByDefault?: boolean
  ) => Promise<{ success: boolean; organization?: unknown }>;
}

export default function OrganizationSetupForm({ onSubmit }: OrganizationSetupFormProps) {
  const [orgName, setOrgName] = useState("");
  const [teamEmails, setTeamEmails] = useState<string[]>([""]);
  const [shareAllBoardsByDefault, setShareAllBoardsByDefault] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { refreshUser } = useUser();

  const addEmailField = () => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) return;

    setIsSubmitting(true);
    try {
      const validEmails = teamEmails.filter((email) => email.trim() && email.includes("@"));
      const result = await onSubmit(orgName.trim(), validEmails, shareAllBoardsByDefault);
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
            <div key={index} className="flex items-center gap-2">
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
                  className="shrink-0 h-9 w-9 flex items-center justify-center"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <Button type="button" variant="outline" onClick={addEmailField} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Team Member
        </Button>

        <p className="text-xs text-muted-foreground">
          {`we'll send invitations to join your organization to these email addresses.`}
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="shareAllBoards"
            checked={shareAllBoardsByDefault}
            onCheckedChange={setShareAllBoardsByDefault}
          />
          <Label htmlFor="shareAllBoards" className="text-sm font-medium cursor-pointer">
            Share all boards with organization members by default
          </Label>
        </div>
        <p className="text-xs text-muted-foreground ml-6">
          When enabled, all new boards will be automatically shared with all organization members. You can still control sharing for individual boards later.
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : hasValidEmails() ? "Save & Send Invites" : "Save"}
      </Button>
    </form>
  );
}
