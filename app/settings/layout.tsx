"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import { User as UserIcon, Building2, ArrowLeft, Settings, LogOut, ChevronDown } from "lucide-react"
import Link from "next/link"
import { signOut } from "next-auth/react"
import { FullPageLoader } from "@/components/ui/loader"
import type { User } from "@/components/note"

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

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
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchUserData()
  }, [fetchUserData])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showUserDropdown) {
        const target = event.target as Element
        if (!target.closest('.user-dropdown')) {
          setShowUserDropdown(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showUserDropdown])

  const handleSignOut = async () => {
    await signOut()
  }

  if (loading) {
    return <FullPageLoader message="Loading settings..." />
  }

  const isProfileActive = pathname === '/settings'
  const isOrganizationActive = pathname === '/settings/organization'

  return (
    <div className="min-h-screen bg-background dark:bg-zinc-900">
      <nav className="bg-card dark:bg-zinc-900 border-b border-border dark:border-zinc-800 shadow-sm">
        <div className="flex justify-between items-center h-16 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-4 sm:space-x-6">
            <Link href="/dashboard" className="flex-shrink-0">
              <h1 className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">Gumboard</h1>
            </Link>
          </div>
          <div className="relative user-dropdown">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center space-x-2 text-foreground dark:text-zinc-100 hover:text-foreground dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 rounded-md px-3 py-2"
            >
              <div className="w-8 h-8 bg-blue-500 dark:bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user?.name ? user.name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium hidden md:inline">
                {user?.name?.split(' ')[0] || 'User'}
              </span>
              <ChevronDown className="w-4 h-4 ml-1" />
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 rounded-md shadow-lg border border-border dark:border-zinc-800 z-50">
                <div className="py-1">
                  <div className="px-4 py-2 text-sm text-muted-foreground dark:text-zinc-400 border-b dark:border-zinc-800">
                    {user?.email}
                  </div>
                  <Link
                    href="/settings"
                    className="flex items-center px-4 py-2 text-sm text-foreground dark:text-zinc-100 hover:bg-accent dark:hover:bg-zinc-800"
                    onClick={() => setShowUserDropdown(false)}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center w-full px-4 py-2 text-sm text-foreground dark:text-zinc-100 hover:bg-accent dark:hover:bg-zinc-800"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="md:hidden bg-card dark:bg-zinc-900 border-b border-border dark:border-zinc-800 px-4 py-3">
        <h2 className="text-lg font-semibold text-foreground dark:text-zinc-100">Settings</h2>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-muted-foreground dark:text-zinc-400 hover:text-foreground dark:hover:text-zinc-100 font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>
        <div className="flex flex-col lg:flex-row lg:space-x-8">
          <div className="lg:w-64 mb-6 lg:mb-0">
            <nav className="flex flex-row lg:flex-col space-x-2 lg:space-x-0 lg:space-y-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
              <Link
                href="/settings"
                className={`flex-shrink-0 lg:w-full flex items-center px-3 sm:px-4 py-2 sm:py-3 text-left rounded-lg transition-colors ${
                  isProfileActive
                    ? "bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900"
                    : "text-foreground dark:text-zinc-100 hover:bg-accent dark:hover:bg-zinc-800"
                }`}
              >
                <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3" />
                <span className="text-sm sm:text-base whitespace-nowrap">Profile</span>
              </Link>
              <Link
                href="/settings/organization"
                className={`flex-shrink-0 lg:w-full flex items-center px-3 sm:px-4 py-2 sm:py-3 text-left rounded-lg transition-colors ${
                  isOrganizationActive
                    ? "bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900"
                    : "text-foreground dark:text-zinc-100 hover:bg-accent dark:hover:bg-zinc-800"
                }`}
              >
                <Building2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3" />
                <span className="text-sm sm:text-base whitespace-nowrap">Organization</span>
              </Link>
            </nav>
          </div>
          <div className="flex-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
