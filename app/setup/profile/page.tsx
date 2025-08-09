import { auth } from "@/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { ProfileImagePicker } from "@/components/profile-image-picker"

async function updateUserName(formData: FormData) {
  "use server"
  
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Not authenticated")
  }

  const name = formData.get("name") as string
  if (!name?.trim()) {
    throw new Error("Name is required")
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { name: name.trim() }
  })

  // Check if user has organization, redirect accordingly
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { organization: true }
  })

  if (!user?.organization) {
    redirect("/setup/organization")
  } else {
    redirect("/dashboard")
  }
}

export default async function ProfileSetup() {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/signin")
  }

  // If user already has a name, check organization setup
  if (session.user.name) {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true }
    })
    
    if (!user?.organization) {
      redirect("/setup/organization")
    } else {
      redirect("/dashboard")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Complete Your Profile</h1>
            <p className="text-muted-foreground">
              Let&apos;s get to know you better
            </p>
          </div>

          {/* Profile Setup Card */}
          <Card className="border-2">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Welcome!</CardTitle>
              <CardDescription className="text-base">
                {session.user.email}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Picture Selection */}
              <div>
                <ProfileImagePicker 
                  userEmail={session.user.email!}
                  userName={session.user.name || undefined}
                  currentImage={session.user.image}
                  showTitle={true}
                  size="lg"
                />
              </div>

              {/* Name Input */}
              <form action={updateUserName} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Your Name</Label>
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
                  Continue to Dashboard
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 