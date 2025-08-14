import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-slate-50 dark:from-zinc-950 dark:to-zinc-900 p-4 sm:p-6">
      <Card className="w-full max-w-sm sm:max-w-md bg-white/95 dark:bg-zinc-900/95 border border-gray-200 dark:border-zinc-800 shadow-sm">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center mb-4 ring-1 ring-blue-200/60 dark:ring-blue-800/40">
            <svg
              className="w-6 h-6 text-blue-700 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <CardTitle className="text-2xl text-foreground dark:text-zinc-100">
            Check your email
          </CardTitle>
          <CardDescription className="text-muted-foreground dark:text-zinc-400">
            We&apos;ve sent you a verification link to complete your account setup
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center dark:text-zinc-400">
            Click the link in the email to verify your account. The link will expire in 24 hours.
          </p>
          <p className="text-sm text-gray-500 dark:text-zinc-500 text-center">
            It may take up to 2 minutes for the email to arrive.
          </p>
          <div className="pt-4">
            <Button asChild variant="outline" className="w-full">
              <Link href="/auth/signin">Back to Sign In</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
