import React, { useEffect, useState } from "react";
import { AlertCircle, ExternalLink, Info } from "lucide-react";
import { useUser } from "@/app/contexts/UserContext";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SLACK_WEBHOOK_REGEX } from "@/lib/constants";
import { Checkbox } from "./ui/checkbox";
import { toast } from "sonner";

const ConnectSlack = ({ orgId }: { orgId: string }) => {
  const [botToken, setBotToken] = useState<string>("");
  const [signingSecret, setSigningSecret] = useState<string>("");
  const [teamId, setTeamId] = useState<string>("");
  const [useManualEntry, setUseManualEntry] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [savingSlack, setSavingSlack] = useState(false);
  const [error, setError] = useState("");
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const [originalSlackWebhookUrl, setOriginalSlackWebhookUrl] = useState("");
  const [errorDialog, setErrorDialog] = useState<any>(null);

  const { user } = useUser();

  const handleSubmit = async () => {
    setIsLoading(true);
    setError("");

    try {
      // 1. Test Slack credentials
      const response = await fetch("/api/slack", {
        method: "POST",
        body: JSON.stringify({ token: botToken, signingSecret }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Failed to fetch Slack team info");
      }

      // 2. Save credentials to backend
      const saveResponse = await fetch("/api/organization/slack", {
        method: "PUT",
        body: JSON.stringify({
          slackToken: botToken,
          slackTeamId: teamId || data.team_id,
          organizationId: orgId,
          slackSigningSecret: signingSecret,
        }),
        headers: { "Content-Type": "application/json" },
      });

      if (!saveResponse.ok) {
        const errData = await saveResponse.json();
        toast.error(errData.error || "Failed to save Slack settings");
        throw new Error(errData.error || "Failed to save Slack settings");
      }

      await handleAddBoard();
      toast.success("Slack connected successfully!");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to connect Slack");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSlack = async () => {
    setSavingSlack(true);

    try {
      if (slackWebhookUrl && !SLACK_WEBHOOK_REGEX.test(slackWebhookUrl)) {
        setErrorDialog({
          open: true,
          title: "Invalid Slack Webhook URL",
          description: "Please enter a valid Slack Webhook URL",
          variant: "error",
        });
        return;
      }

      const response = await fetch("/api/organization", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slackWebhookUrl }),
      });

      if (response.ok) {
        setOriginalSlackWebhookUrl(slackWebhookUrl);
      } else {
        const errorData = await response.json();
        setErrorDialog({
          open: true,
          title: "Failed to update organization",
          description: errorData.error || "Failed to update organization",
        });
      }
    } catch (err) {
      console.error("Error updating Slack webhook URL:", err);
    } finally {
      setSavingSlack(false);
    }
  };

  const handleAddBoard = async () => {
    try {
      await fetch("/api/boards/slack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Slack Board",
          description: "Created via Slack integration",
        }),
      });
    } catch (err) {
      console.error("Error adding board:", err);
    }
  };

  useEffect(() => {
    if (user?.organization) {
      setSigningSecret(user.organization.slackSigningSecret || "");
      setBotToken(user.organization.slackBotToken || "");
      setTeamId(user.organization.slackTeamId || "");
    }
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Slack Integration</h3>
        <p className="text-gray-600">Configure Slack notifications for notes and todos.</p>
      </div>

      {/* Webhook Section */}
      <div>
        <Label htmlFor="slackWebhookUrl">Slack Webhook URL</Label>
        <Input
          id="slackWebhookUrl"
          type="url"
          value={slackWebhookUrl}
          onChange={(e) => setSlackWebhookUrl(e.target.value)}
          placeholder="https://hooks.slack.com/services/..."
          className="mt-2"
          disabled={!user?.isAdmin}
        />
        <Button
          onClick={handleSaveSlack}
          disabled={savingSlack || slackWebhookUrl === originalSlackWebhookUrl || !user?.isAdmin}
          className="mt-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white dark:text-zinc-100"
        >
          {savingSlack ? "Saving..." : "Save changes"}
        </Button>
      </div>

      {/* Bot Token */}
      <div className="flex flex-col gap-2">
        <Label>Bot User OAuth Token</Label>
        <Input
          type="text"
          value={botToken}
          onChange={(e) => setBotToken(e.target.value)}
          placeholder="xoxb-your-bot-token"
        />
      </div>

      {/* Signing Secret */}
      <div className="flex flex-col gap-2">
        <Label>Signing Secret</Label>
        <Input
          type="text"
          value={signingSecret}
          onChange={(e) => setSigningSecret(e.target.value)}
          placeholder="your-signing-secret"
        />
      </div>

      {/* Manual Team ID Option */}
      <div className="">
        <div className="flex items-center gap-2 mb-3">
          <Checkbox
            id="manualEntry"
            checked={useManualEntry}
            onCheckedChange={(checked) => setUseManualEntry(!!checked)}
          />
          <label htmlFor="manualEntry" className="text-sm font-medium">
            Manually enter Team ID
          </label>
        </div>

        {useManualEntry && (
          <Input
            type="text"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            placeholder="T1234567890"
          />
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={isLoading || !botToken || !signingSecret || (useManualEntry && !teamId)}
        className="mt-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white dark:text-zinc-100"
      >
        {isLoading ? "Connecting..." : "Connect Slack"}
      </Button>
    </div>
  );
};

export default ConnectSlack;
