"use client";

import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

const errorMessages: Record<string, string> = {
  Configuration: "There is a problem with the server configuration.",
  AccessDenied: "Access denied. You do not have permission to sign in.",
  Verification: "The verification token has expired or has already been used.",
  OAuthAccountNotLinked:
    "To confirm your identity, sign in with the same provider you used originally.",
  Default: "An unexpected error occurred. Please try again.",
};

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") || "Default";
  const errorMessage = errorMessages[error] || errorMessages.Default;

  return (
    <Card className="w-full max-w-md bg-white dark:bg-zinc-900 dark:border-zinc-800">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
        </div>
        <CardTitle className="text-2xl text-zinc-900 dark:text-zinc-100">
          Authentication Error
        </CardTitle>
        <CardDescription className="text-zinc-600 dark:text-zinc-300">
          Something went wrong during sign in
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground dark:text-zinc-400">{errorMessage}</p>
        </div>
        <div className="pt-4">
          <Button
            asChild
            className="w-full dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700"
          >
            <Link href="/auth/signin">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Try again
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingFallback() {
  return (
    <Card className="w-full max-w-md bg-white dark:bg-zinc-900 dark:border-zinc-800">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-muted dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
          <div className="w-6 h-6 animate-spin rounded-full border-2 border-muted-foreground dark:border-zinc-400 border-t-foreground dark:border-t-zinc-100" />
        </div>
        <CardTitle className="text-2xl text-zinc-900 dark:text-zinc-100">Loading...</CardTitle>
        <CardDescription className="text-zinc-600 dark:text-zinc-300">
          Please wait while we process your request
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

export default function AuthError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-zinc-950 dark:to-zinc-900 p-4">
      <Suspense fallback={<LoadingFallback />}>
        <AuthErrorContent />
      </Suspense>
    </div>
  );
}
