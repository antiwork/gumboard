"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail } from "lucide-react";
import { Loader } from "@/components/ui/loader";
import { useUser } from "@/app/contexts/UserContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function ProfileSettingsPage() {
  const { user, loading, refreshUser } = useUser();
  const [saving, setSaving] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (user) {
      setProfileName(user.name || "");
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/signin");
    }
  }, [user, loading, router]);

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
        await refreshUser();
        setProfileName(profileName.trim());
        toast.success("Profile updated successfully");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("An error occurred while updating profile");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword) {
      toast.error("Password is required");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newPassword,
        }),
      });

      if (response.ok) {
        toast.success("Password updated successfully");
        setNewPassword("");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update password");
      }
    } catch (error) {
      console.error("Error updating password:", error);
      toast.error("An error occurred while updating password");
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
            <Label htmlFor="name" className="text-foreground dark:text-zinc-200">
              Full Name
            </Label>
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
            <Label htmlFor="email" className="text-foreground dark:text-zinc-200">
              Email Address
            </Label>
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
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>

        <div className="pt-6 border-t border-gray-200 dark:border-zinc-800">
          <h3 className="text-lg font-medium text-foreground dark:text-zinc-100 mb-4">Password</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newPassword" className="text-foreground dark:text-zinc-200">
                New Password
              </Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter your new password (min 8 characters)"
                className="mt-1 bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100"
              />
            </div>
            <div>
              <Button
                onClick={handleUpdatePassword}
                disabled={saving || !newPassword}
                className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
              >
                {saving ? "Updating..." : "Update password"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
