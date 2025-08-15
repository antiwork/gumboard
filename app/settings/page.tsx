"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Trash2, AlertTriangle } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useUser } from "@/app/contexts/UserContext";
import { useRouter } from "next/navigation";

export default function ProfileSettingsPage() {
  const { user, loading, refreshUser } = useUser();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [profileName, setProfileName] = useState("");
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

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const response = await fetch("/api/user", { method: "DELETE" });
      if (response.ok) {
        router.push("/");
        return;
      }
      console.error("Error deleting account:", await response.text());
    } catch (error) {
      console.error("Error deleting account:", error);
    } finally {
      setDeleting(false);
    }
  };

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
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
        <div className="pt-6 border-t border-gray-200 dark:border-zinc-800">
          <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50/60 dark:bg-red-950/30 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">
                  Danger zone
                </h3>
                <p className="text-sm text-red-700/80 dark:text-red-300/80">
                  Deleting your account will remove you from your organization and delete content
                  you created that is owned by you. This action cannot be undone.
                </p>
                <div className="mt-4">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="bg-red-600 hover:bg-red-700 text-white">
                        <Trash2 className="w-4 h-4" />
                        Delete account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="sm:max-w-md bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5" />
                          Delete account?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-foreground dark:text-zinc-100">
                          This will permanently delete your account and related data. This action
                          cannot be undone.
                          <ul className="list-disc pl-5 mt-2 text-sm">
                            <li>You will be signed out immediately.</li>
                            <li>Your personal profile will be removed.</li>
                            <li>
                              Notes and content owned by you may be deleted or reassigned, depending
                              on organization settings.
                            </li>
                          </ul>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel
                          disabled={deleting}
                          className="bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100 border border-gray-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 hover:bg-red-700 text-white"
                          onClick={handleDeleteAccount}
                          disabled={deleting}
                        >
                          {deleting ? "Deleting..." : "Yes, delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
