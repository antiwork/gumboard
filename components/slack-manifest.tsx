"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

const manifest = {
  display_information: {
    name: "gumboard",
    description: "A application for gumboard integration with Slack",
    background_color: "#2c2d30",
  },
  features: {
    app_home: {
      home_tab_enabled: false,
      messages_tab_enabled: true,
      messages_tab_read_only_enabled: false,
    },
    bot_user: {
      display_name: "gumboard",
      always_online: true,
    },
  },
  oauth_config: {
    scopes: {
      bot: [
        "app_mentions:read",
        "channels:history",
        "channels:read",
        "chat:write",
        "im:history",
        "im:read",
        "im:write",
        "users:read",
        "users:read.email",
      ],
    },
  },
  settings: {
    event_subscriptions: {
      request_url: "https://gumboard.com/boards/api/slack/events",
      bot_events: ["app_mention", "message.im"],
    },
    interactivity: {
      is_enabled: false,
    },
    org_deploy_enabled: false,
    socket_mode_enabled: false,
    token_rotation_enabled: false,
  },
};

export default function CopyManifest() {
  const [copied, setCopied] = useState(false);

  const copyManifest = async () => {
    try {
      const text = JSON.stringify(manifest, null, 2);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Manifest copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
      toast.error("Failed to copy manifest");
    }
  };

  return (
    <button
      onClick={copyManifest}
      className="inline-flex items-center gap-2      py-2 hover:text-sky-600 cursor-pointer"
    >
      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
      <span className="text-sm">Copy manifest.json</span>
    </button>
  );
}
