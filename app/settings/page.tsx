"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail } from "lucide-react"
import { Loader } from "@/components/ui/loader"
import { toast } from "sonner"

interface User {
  id: string
  name: string | null
  email: string
  organization: {
    id: string
    name: string
    members: {
      id: string
      name: string | null
      email: string
    }[]
  } | null
}

export default function ProfileSettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profileName, setProfileName] = useState("")
  const router = useRouter()

  const fetchUserData = useCallback(async () => {
    try {
      const response = await fetch("/api/user")
      if (response.status === 401) {
        router.push("/auth/signin")
        return
      }

      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        setProfileName(userData.name || "")
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
      toast.error("Failed to load profile", {
        description: "Please refresh the page or try again later."
      })
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchUserData()
  }, [fetchUserData])

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: profileName,
        }),
      })

      if (response.ok) {
        const updatedUser = await response.json()
        setUser(updatedUser)
        toast.success("Profile updated successfully", {
          description: "Your profile information has been saved."
        })
      } else {
        const errorData = await response.json()
        toast.error("Failed to update profile", {
          description: errorData.error || "Please try again or contact support if the problem persists."
        })
      }
    } catch (error) {
      console.error("Error updating profile:", error)
      toast.error("Failed to update profile", {
        description: "Please check your connection and try again."
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader size="lg" />
      </div>
    )
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Profile Settings</h2>
          <p className="text-gray-600">Manage your personal information and preferences.</p>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Enter your full name"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="email">Email Address</Label>
            <div className="relative mt-1">
              <Input
                id="email"
                type="email"
                value={user?.email || ""}
                disabled
                className="bg-gray-50 cursor-not-allowed"
              />
              <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <Button
            onClick={handleSaveProfile}
            disabled={saving || profileName === user?.name}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </Card>
  )
} 