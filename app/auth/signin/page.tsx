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
import { BetaBadge } from "@/components/ui/beta-badge";
import Image from "next/image";

function SignInContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isResent, setIsResent] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup" | "magic">("signin");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const emailParam = searchParams.get("email");
    const verifiedParam = searchParams.get("verified");
    if (emailParam) {
      setEmail(emailParam);
    }
    if (verifiedParam === "true") {
      setError("");
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

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setError("");

    try {
      if (mode === "signup") {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Signup failed");
          return;
        }

        router.push("/auth/verify-email");
      } else {
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
          callbackUrl: searchParams.get("callbackUrl") || "/dashboard",
        });

        if (result?.error) {
          setError(result.error);
        } else if (result?.url) {
          router.push(result.url);
        }
      }
    } catch (error) {
      console.error("Auth error:", error);
      setError("An unexpected error occurred");
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-slate-50 dark:from-zinc-950 dark:to-zinc-900 p-4 sm:p-6">
        <Card className="w-full max-w-sm sm:max-w-md bg-white/95 dark:bg-zinc-900/95 border border-gray-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mb-4 ring-1 ring-green-200/60 dark:ring-green-800/40">
              <Mail className="w-6 h-6 text-green-700 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl text-foreground dark:text-zinc-100">
              Check your email
            </CardTitle>
            <CardDescription className="text-muted-foreground dark:text-zinc-400">
              We&apos;ve sent a magic link to{" "}
              <strong className="text-foreground dark:text-zinc-100">{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center mb-4 dark:text-zinc-400">
              Click the link in the email to sign in to your account. The link will expire in 24
              hours.
            </p>
            <p className="text-sm text-gray-500 dark:text-zinc-500 text-center mb-4">
              It may take up to 2 minutes for the email to arrive.
            </p>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-between bg-white border-gray-200 text-gray-900 hover:bg-gray-50 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-900 transition-colors active:scale-95"
                onClick={() => window.open("https://mail.google.com", "_blank")}
              >
                Open Gmail
                <ExternalLink className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                className="w-full justify-between bg-white border-gray-200 text-gray-900 hover:bg-gray-50 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-900 transition-colors active:scale-95"
                onClick={() => window.open("https://outlook.live.com", "_blank")}
              >
                Open Outlook
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              className="w-full bg-white border-gray-200 text-gray-900 hover:bg-gray-50 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-900 transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500 dark:focus-visible:ring-zinc-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-900"
              onClick={handleResendEmail}
              disabled={isResending}
              aria-busy={isResending}
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-slate-50 dark:from-zinc-950 dark:to-zinc-900 p-4 sm:p-6">
      <Card className="w-full bg-white max-w-sm sm:max-w-md dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center mb-4 ring-1 ring-blue-200/60 dark:ring-blue-800/40">
            <Image src="/logo/gumboard.svg" alt="Gumboard Logo" width={48} height={48} />
          </div>
          <CardTitle className="text-xl sm:text-2xl font-bold text-foreground dark:text-zinc-100 flex items-center gap-2 justify-center">
            Welcome to Gumboard
            <BetaBadge />
          </CardTitle>
          <CardDescription className="text-muted-foreground dark:text-zinc-400">
            {mode === "signup" ? "Create your account" : mode === "signin" ? "Sign in to your account" : "Enter your email and we'll send you a magic link"}
          </CardDescription>
        </CardHeader>

        <div className="px-6 pb-4">
          <div className="flex bg-gray-100 dark:bg-zinc-800 rounded-lg p-1">
            <button
              onClick={() => setMode("signin")}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                mode === "signin" 
                  ? "bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 shadow-sm" 
                  : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                mode === "signup" 
                  ? "bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 shadow-sm" 
                  : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200"
              }`}
            >
              Sign Up
            </button>
            <button
              onClick={() => setMode("magic")}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                mode === "magic" 
                  ? "bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 shadow-sm" 
                  : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200"
              }`}
            >
              Magic Link
            </button>
          </div>
        </div>

        <form onSubmit={mode === "magic" ? handleSubmit : handlePasswordAuth}>
          <CardContent className="space-y-4">
            {searchParams.get("verified") === "true" && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3">
                <p className="text-sm text-green-800 dark:text-green-300">
                  ✅ Email verified successfully! You can now sign in.
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
              </div>
            )}

            {searchParams.get("email") && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  📧 You&apos;re signing in from an organization invitation
                </p>
              </div>
            )}

            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground dark:text-zinc-200">
                  Name (optional)
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  className="h-12 bg-white border-gray-300 text-foreground placeholder:text-gray-400"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground dark:text-zinc-200">
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
                className="h-12 bg-white border-gray-300 text-foreground placeholder:text-gray-400 hover:border-gray-400 transition-colors"
              />
            </div>

            {mode !== "magic" && (
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground dark:text-zinc-200">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={mode === "signup" ? "Create a password (min 8 characters)" : "Enter your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  minLength={mode === "signup" ? 8 : undefined}
                  className="h-12 bg-white border-gray-300 text-foreground placeholder:text-gray-400"
                />
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col">
            <Button
              type="submit"
              className="w-full h-12 font-medium mt-4 bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 transition-all focus-visible:ring-2 focus-visible:ring-blue-500 dark:focus-visible:ring-zinc-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-900"
              disabled={isLoading || !email || (mode !== "magic" && !password)}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {mode === "signup" ? "Creating account..." : mode === "signin" ? "Signing in..." : "Sending magic link..."}
                </>
              ) : (
                <>
                  {mode === "signup" ? "Create Account" : mode === "signin" ? "Sign In" : "Continue with Email"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>

            <div className="relative mt-6 w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200 dark:border-zinc-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-muted-foreground dark:bg-zinc-900 dark:text-zinc-400">
                  or continue with
                </span>
              </div>
            </div>

            <div className="space-y-3 w-full mt-4">
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 justify-center bg-white border-gray-200 text-gray-900 hover:bg-gray-50 active:scale-[0.98] dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-100 cursor-pointer dark:hover:bg-zinc-900 transition-all"
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
                Continue with Google
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full h-12 justify-center bg-white border-gray-200 text-gray-900 hover:bg-gray-50 active:scale-[0.98] dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-100 cursor-pointer dark:hover:bg-zinc-900 transition-all"
                onClick={() => signIn("github", { callbackUrl: "/" })}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                Continue with GitHub
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-slate-50 dark:from-zinc-950 dark:to-zinc-900 p-4 sm:p-6">
      <Card className="w-full max-w-sm sm:max-w-md bg-white/95 dark:bg-zinc-900/95 border border-gray-200 dark:border-zinc-800 shadow-sm">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4 dark:bg-zinc-800">
            <div className="w-6 h-6 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground dark:border-zinc-700 dark:border-t-zinc-100" />
          </div>
          <CardTitle className="text-xl sm:text-2xl text-foreground dark:text-zinc-100">
            Loading...
          </CardTitle>
          <CardDescription className="text-muted-foreground dark:text-zinc-400">
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
