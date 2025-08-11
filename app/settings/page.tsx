"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail } from "lucide-react";
import { Loader } from "@/components/ui/loader";
import type { User } from "@/components/note";

export default function ProfileSettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileName, setProfileName] = useState("");
  const router = useRouter();

  const fetchUserData = useCallback(async () => {
    try {
      const response = await fetch("/api/user");
      if (response.status === 401) {
        router.push("/auth/signin");
        return;
      }

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setProfileName(userData.name || "");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: profileName,
        }),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser);
        setProfileName((updatedUser.name || "").trim());
      }
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 bg-white dark:bg-black min-h-screen">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <Card className="p-6 bg-white dark:bg-black border border-gray-200 dark:border-zinc-800">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground dark:text-zinc-100 mb-2">
            Profile Settings
          </h2>
          <p className="text-muted-foreground dark:text-zinc-400">
            Manage your personal information and preferences.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-foreground dark:text-zinc-200">Full Name</Label>
            <Input
              id="name"
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Enter your full name"
              className="mt-1 bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100"
            />
          </div>

          <div>
            <Label htmlFor="email" className="text-foreground dark:text-zinc-200">Email Address</Label>
            <div className="relative mt-1">
              <Input
                id="email"
                type="email"
                value={user?.email || ""}
                disabled
                className="bg-muted dark:bg-zinc-800 text-muted-foreground dark:text-zinc-400 cursor-not-allowed"
              />
              <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground dark:text-zinc-400" />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200 dark:border-zinc-800">
          <Button
            onClick={handleSaveProfile}
            disabled={
              saving ||
              profileName.trim().length === 0 ||
              profileName.trim() === (user?.name || "").trim()
            }
            className="bg-black hover:bg-zinc-900 text-white dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
