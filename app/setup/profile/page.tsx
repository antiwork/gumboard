import { auth } from "@/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

async function updateUserName(formData: FormData) {
  "use server";

  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  const name = formData.get("name") as string;
  if (!name?.trim()) {
    throw new Error("Name is required");
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { name: name.trim() },
  });

  // Check if user has organization, redirect accordingly
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { organization: true },
  });

  if (!user?.organization) {
    redirect("/setup/organization");
  } else {
    redirect("/dashboard");
  }
}

export default async function ProfileSetup() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // If user already has a name, check organization setup
  if (session.user.name) {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true },
    });

    if (!user?.organization) {
      redirect("/setup/organization");
    } else {
      redirect("/dashboard");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2 text-blue-700 dark:text-blue-300">
              Complete Your Profile
            </h1>
            <p className="text-muted-foreground dark:text-zinc-400">
              Let&apos;s get to know you better
            </p>
          </div>

          {/* Profile Setup Card */}
          <Card className="border-2 bg-white dark:bg-zinc-900 dark:border-zinc-800">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {session.user.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <CardTitle className="text-xl text-blue-700 dark:text-blue-300">Welcome!</CardTitle>
              <CardDescription className="text-base text-muted-foreground dark:text-zinc-400">
                {session.user.email}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={updateUserName} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="dark:text-white">
                    Your Name
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Enter your full name"
                    required
                    className="w-full"
                  />
                </div>

                <Button type="submit" className="w-full">
                  Save
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
