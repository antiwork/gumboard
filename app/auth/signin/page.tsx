"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowRight, Loader2, ExternalLink } from "lucide-react";

function SignInContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isResent, setIsResent] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      router.replace(`/auth/error?error=${errorParam}`);
    }
  }, [searchParams, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      const callbackUrl = searchParams.get("callbackUrl") || "/";
      await signIn("resend", {
        email,
        redirect: false,
        callbackUrl,
      });
      setIsSubmitted(true);
    } catch (error) {
      console.error("Sign in error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setIsResending(true);
    try {
      const callbackUrl = searchParams.get("callbackUrl") || "/";
      await signIn("resend", {
        email,
        redirect: false,
        callbackUrl,
      });
      setIsResent(true);
      setTimeout(() => {
        setIsResent(false);
      }, 2500);
    } catch (error) {
      console.error("Resend email error:", error);
    } finally {
      setIsResending(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-zinc-950 dark:to-zinc-900 p-4 sm:p-6">
        <Card className="w-full max-w-sm sm:max-w-md dark:bg-zinc-900 dark:border-zinc-800">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl dark:text-zinc-100">
              Check your email
            </CardTitle>
            <CardDescription className="dark:text-zinc-400">
              We&apos;ve sent a magic link to{" "}
              <strong className="dark:text-zinc-100">{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center mb-4 dark:text-zinc-400">
              Click the link in the email to sign in to your account. The link
              will expire in 24 hours.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 text-center mb-4">
              It may take up to 2 minutes for the email to arrive.
            </p>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-between dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-900"
                onClick={() => window.open("https://mail.google.com", "_blank")}
              >
                Open Gmail
                <ExternalLink className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                className="w-full justify-between dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-900"
                onClick={() =>
                  window.open("https://outlook.live.com", "_blank")
                }
              >
                Open Outlook
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              className="w-full dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-900"
              onClick={handleResendEmail}
              disabled={isResending}
            >
              {isResending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending another email...
                </>
              ) : isResent ? (
                "Sent!"
              ) : (
                "Send another email"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-zinc-950 dark:to-zinc-900 p-4 sm:p-6">
      <Card className="w-full max-w-sm sm:max-w-md dark:bg-zinc-900 dark:border-zinc-800">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-xl sm:text-2xl font-bold dark:text-zinc-100">
            Welcome to Gumboard
          </CardTitle>
          <CardDescription className="dark:text-zinc-400">
            {searchParams.get("email")
              ? "we'll send you a magic link to verify your email address"
              : "Enter your email address and we'll send you a magic link to sign in"}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {searchParams.get("email") && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  📧 You&apos;re signing in from an organization invitation
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="dark:text-zinc-200">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading || !!searchParams.get("email")}
                required
                className="h-12 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col">
            <Button
              type="submit"
              className="w-full h-12 font-medium mt-4 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              disabled={isLoading || !email}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending magic link...
                </>
              ) : (
                <>
                  Continue with Email
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>

            {/* Divider */}
            <div className="relative mt-6 w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300 dark:border-zinc-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-muted-foreground dark:bg-zinc-900 dark:text-zinc-400">
                  or continue with
                </span>
              </div>
            </div>

            {/* Google Button */}
            <div className="flex flex-row gap-3 w-full mt-4">
              {/* Google Button */}
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-12 justify-center dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-100 cursor-pointer dark:hover:bg-zinc-900"
                onClick={() => signIn("google", { callbackUrl: "/" })}
              >
                <svg
                  className="w-5 h-5 mr-2"
                  viewBox="0 0 48 48"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M44.5 20H24v8.5h11.9C34.3 32.4 29.8 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8.1 3.1l6-6C34.1 4.3 29.3 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11.3 0 20.8-8.2 22-19h-1.5z"
                    fill="#FFC107"
                  />
                  <path
                    d="M6.3 14.7l7 5.1C14.5 16.4 18.9 14 24 14c3.1 0 5.9 1.2 8.1 3.1l6-6C34.1 4.3 29.3 2 24 2c-7.7 0-14.3 3.7-18.3 9.5l.6 3.2z"
                    fill="#FF3D00"
                  />
                  <path
                    d="M24 46c5.8 0 11.1-2.2 15.1-5.7l-7-5.7c-2 1.4-4.6 2.2-8.1 2.2-5.8 0-10.6-3.9-12.3-9.2l-7.1 5.5C7.6 41.5 15.2 46 24 46z"
                    fill="#4CAF50"
                  />
                  <path
                    d="M44.5 20H24v8.5h11.9c-1.1 3.2-3.5 5.8-6.6 7.2l7 5.7c4.1-3.4 6.8-8.5 6.8-14.4 0-1.3-.1-2.5-.3-3.7z"
                    fill="#1976D2"
                  />
                </svg>
                Google
              </Button>

              {/* GitHub Button */}
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-12 justify-center dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-100 cursor-pointer dark:hover:bg-zinc-900"
                onClick={() => signIn("github", { callbackUrl: "/" })}
              >
                <svg
                  className="w-5 h-5 mr-2"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 .5C5.65.5.5 5.65.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.5v-2c-3.2.7-3.8-1.4-3.8-1.4-.5-1.2-1.2-1.5-1.2-1.5-1-.7.1-.7.1-.7 1.1.1 1.6 1.1 1.6 1.1 1 .1 1.5.8 2.2 1 .1-.7.4-1.1.7-1.4-2.6-.3-5.4-1.3-5.4-5.8 0-1.3.5-2.3 1.1-3.2-.1-.3-.5-1.5.1-3.1 0 0 .9-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.3-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.7.9 1.1 1.9 1.1 3.2 0 4.5-2.8 5.5-5.4 5.8.5.5.8 1.1.8 2.2v3.3c0 .3.2.6.8.5A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"
                  />
                </svg>
                GitHub
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-zinc-950 dark:to-zinc-900 p-4 sm:p-6">
      <Card className="w-full max-w-sm sm:max-w-md dark:bg-zinc-900 dark:border-zinc-800">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4 dark:bg-zinc-800">
            <div className="w-6 h-6 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground dark:border-zinc-700 dark:border-t-zinc-100" />
          </div>
          <CardTitle className="text-xl sm:text-2xl dark:text-zinc-100">
            Loading...
          </CardTitle>
          <CardDescription className="dark:text-zinc-400">
            Please wait while we prepare the sign in page
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

export default function SignIn() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SignInContent />
    </Suspense>
  );
}
