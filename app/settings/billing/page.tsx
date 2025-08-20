"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function BillingStatusPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const upgrade = sp.get("upgrade");          // "success" | "cancel"
  const sessionId = sp.get("session_id");     // from Stripe

  const [status, setStatus] = useState<"idle"|"syncing"|"ok"|"error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    // optional fallback: if webhooks didn’t run, sync using session_id
    if (upgrade === "success" && sessionId) {
      setStatus("syncing");
      fetch(`/api/billing/sync?session_id=${encodeURIComponent(sessionId)}`)
        .then(r => r.json())
        .then((j) => {
          if (j?.ok) {
            setStatus("ok");
            setMessage("Your subscription was activated. Redirecting…");
            setTimeout(() => router.push("/dashboard"), 1200);
          } else {
            setStatus("error");
            setMessage(j?.error || "Could not confirm subscription.");
          }
        })
        .catch(() => {
          setStatus("error");
          setMessage("Could not confirm subscription.");
        });
    }
  }, [upgrade, sessionId, router]);

  if (upgrade === "cancel") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-center">
        <div className="space-y-4">
          <h1 className="text-xl font-semibold">Payment canceled</h1>
          <p className="text-muted-foreground">No changes were made to your plan.</p>
          <Button onClick={() => router.push("/dashboard")}>Back to dashboard</Button>
        </div>
      </div>
    );
  }

  // success (with or without sync)
  return (
    <div className="flex min-h-[60vh] items-center justify-center text-center">
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Thank you!</h1>
        <p className="text-muted-foreground">
          {status === "syncing" && "Confirming your subscription…"}
          {status === "ok" && message}
          {status === "error" && message}
          {status === "idle" && "Returning to the app…"}
        </p>
        <Button onClick={() => router.push("/dashboard")}>Go to dashboard</Button>
      </div>
    </div>
  );
}
