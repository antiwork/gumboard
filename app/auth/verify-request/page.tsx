import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function VerifyRequest() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-zinc-950 dark:to-zinc-900 p-4">
      <Card className="w-full max-w-md bg-white dark:bg-zinc-900 dark:border-zinc-800">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl text-zinc-900 dark:text-zinc-100">
            Check your email
          </CardTitle>
          <CardDescription className="text-zinc-600 dark:text-zinc-300">
            We&apos;ve sent you a magic link to sign in
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground dark:text-zinc-400">
              Click the link in the email to sign in to your account. The link will expire in 24
              hours.
            </p>
          </div>
          <div className="pt-4">
            <Button
              asChild
              variant="outline"
              className="w-full dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700"
            >
              <Link href="/auth/signin">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to sign in
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
