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
import { Mail, Loader2, ExternalLink } from "lucide-react";
import Image from "next/image";

const emailProviders = [
  {
    name: "Gmail",
    url: "https://mail.google.com",
  },
  {
    name: "Outlook",
    url: "https://outlook.live.com",
  },
];

const oauthProviders = [
  {
    id: "google",
    name: "Google",
    icon: (
      <svg
        className="w-5 h-5 mr-2"
        viewBox="0 0 512 512"
        xmlns="http://www.w3.org/2000/svg"
        fillRule="evenodd"
        clipRule="evenodd"
        strokeLinejoin="round"
        strokeMiterlimit="2"
      >
        <path
          d="M32.582 370.734C15.127 336.291 5.12 297.425 5.12 256c0-41.426 10.007-80.291 27.462-114.735C74.705 57.484 161.047 0 261.12 0c69.12 0 126.836 25.367 171.287 66.793l-73.31 73.309c-26.763-25.135-60.276-38.168-97.977-38.168-66.56 0-123.113 44.917-143.36 105.426-5.12 15.36-8.146 31.65-8.146 48.64 0 16.989 3.026 33.28 8.146 48.64l-.303.232h.303c20.247 60.51 76.8 105.426 143.36 105.426 34.443 0 63.534-9.31 86.341-24.67 27.23-18.152 45.382-45.148 51.433-77.032H261.12v-99.142h241.105c3.025 16.757 4.654 34.211 4.654 52.364 0 77.963-27.927 143.592-76.334 188.276-42.356 39.098-100.305 61.905-169.425 61.905-100.073 0-186.415-57.483-228.538-141.032v-.233z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    id: "github",
    name: "GitHub",
    icon: (
      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
      </svg>
    ),
  },
];

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
        <Card className="w-full max-w-sm sm:max-w-md border-none shadow-none bg-transparent">
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
            <p className="text-sm text-gray-500 dark:text-zinc-500 text-center mb-4">
              It may take up to 2 minutes for the email to arrive.
            </p>
            <div className="space-y-2">
              {emailProviders.map((provider) => (
                <Button
                  key={provider.name}
                  variant="outline"
                  className="w-full justify-between bg-white border-gray-200 text-gray-900 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-900 transition-colors active:scale-95"
                  onClick={() => window.open(provider.url, "_blank")}
                >
                  Open {provider.name}
                  <ExternalLink className="w-4 h-4" />
                </Button>
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              className="w-full border-gray-200 text-gray-900 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-900 transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500 dark:focus-visible:ring-zinc-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-900"
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
      <Card className="w-full max-w-sm sm:max-w-md border-none shadow-none bg-transparent">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center mb-4 ring-1 ring-blue-200/60 dark:ring-blue-800/40">
            <Image src="/logo/gumboard.svg" alt="Gumboard Logo" width={48} height={48} />
          </div>
          <CardTitle className="text-xl sm:text-2xl font-bold text-foreground dark:text-zinc-100 flex items-center gap-2 justify-center">
            Welcome to Gumboard
          </CardTitle>
          <CardDescription className="text-muted-foreground dark:text-zinc-400">
            {mode === "signup"
              ? "Create your account."
              : mode === "signin"
                ? "Sign in to your account."
                : searchParams.get("email")
                  ? "we'll send you a magic link to verify your email address"
                  : "Enter your email to sign in and we'll send you a magic link."}
          </CardDescription>
        </CardHeader>

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

            {/* OAuth Buttons at top */}
            <div className="space-y-3 w-full">
              {oauthProviders.map((provider) => (
                <Button
                  key={provider.id}
                  type="button"
                  variant="outline"
                  className="w-full h-12 justify-center bg-white border-gray-200 text-gray-900 active:scale-[0.98] dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-100 cursor-pointer dark:hover:bg-sky-600 transition-all"
                  onClick={() => signIn(provider.id, { callbackUrl: "/" })}
                >
                  {provider.icon}
                  Continue with {provider.name}
                </Button>
              ))}

              <Button
                type="button"
                variant="outline"
                className="w-full h-12 justify-center bg-white border-gray-200 text-gray-900 active:scale-[0.98] dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-100 cursor-pointer dark:hover:bg-sky-600 transition-all"
                onClick={() => setMode(mode === "magic" ? "signin" : "magic")}
              >
                {mode === "magic" ? "Continue with password" : "Continue with magic link"}
              </Button>
            </div>

            {/* Divider: line or line */}
            <div className="mt-6 w-full flex items-center">
              <div className="h-px flex-1 bg-gray-200 dark:bg-zinc-700" />
              <span className="mx-3 text-sm text-muted-foreground dark:text-zinc-400">or</span>
              <div className="h-px flex-1 bg-gray-200 dark:bg-zinc-700" />
            </div>

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
                Email
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
                  placeholder={
                    mode === "signup"
                      ? "Create a password (min 8 characters)"
                      : "Enter your password"
                  }
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
              className="w-full h-12 font-medium mt-4 bg-sky-600 text-white hover:bg-sky-600/80 active:scale-[0.98] dark:bg-sky-600 dark:text-zinc-100 dark:hover:bg-sky-600/80 transition-all focus-visible:ring-2 focus-visible:ring-blue-500 dark:focus-visible:ring-zinc-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-900"
              disabled={isLoading || !email || (mode !== "magic" && !password)}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {mode === "signup"
                    ? "Creating account..."
                    : mode === "signin"
                      ? "Signing in..."
                      : "Sending magic link..."}
                </>
              ) : (
                <>
                  {mode === "signup"
                    ? "Create account"
                    : mode === "signin"
                      ? "Sign in"
                      : "Continue"}
                </>
              )}
            </Button>

            <div className="text-center">
              {mode === "signin" ? (
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="mt-6 text-sm text-gray-600 cursor-pointer hover:text-sky-600 underline-offset-2 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                  Don&apos;t have an account? Sign up
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="mt-6 text-sm text-gray-600 cursor-pointer hover:text-sky-600 underline-offset-2 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                  Already have an account? Sign in
                </button>
              )}
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
