"use client";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useUser } from "@/app/contexts/UserContext";
import { useEffect } from "react";

export default function OrganizationBillingPage() {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/signin");
    }
  }, [user, loading, router]);

  if (!user?.organization) {
    router.push("/setup/organization");
    return null;
  }

  const currentPlan = user.organization.planName;
  const subscriptionStatus = user.organization.subscriptionStatus || "Active";

  // Badge utility
  const badgeClasses = (type: "plan" | "status") => {
    if (type === "plan") {
      return currentPlan === "FREE"
        ? "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
        : "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100";
    }
    if (type === "status") {
      return subscriptionStatus === "FAILED"
        ? "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100"
        : "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100";
    }
    return "";
  };

  return (
    <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">
        Organization Billing
      </h1>

      <Card className="bg-white dark:bg-zinc-900 dark:text-white">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Your Subscription</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-700 dark:text-gray-300 font-medium">Current Plan:</span>
            <span
              className={`px-3 py-1 text-sm font-semibold rounded-full uppercase ${badgeClasses(
                "plan"
              )}`}
            >
              {currentPlan}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-700 dark:text-gray-300 font-medium">Status:</span>
            <span
              className={`px-3 py-1 text-sm font-semibold rounded-full uppercase ${badgeClasses(
                "status"
              )}`}
            >
              {subscriptionStatus}
            </span>
          </div>

          {currentPlan === "FREE" && (
            <div className="pt-4">
              <Link href="/pricing">
                <Button className="w-full">Upgrade Plan</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
