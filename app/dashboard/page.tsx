"use client"

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { signOut } from "next-auth/react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { Plus, Trash2, Settings, LogOut, ChevronDown, Grid3x3 } from "lucide-react"
import { useRouter } from "next/navigation"
import { FullPageLoader } from "@/components/ui/loader"

interface Board {
  id: string
  name: string
  description: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
  _count: {
    notes: number
  }
}

interface User {
  id: string
  name: string | null
  email: string
  isAdmin: boolean
  organization: {
    name: string
  } | null
}

export default function Dashboard() {
  const [boards, setBoards] = useState<Board[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddBoard, setShowAddBoard] = useState(false)
  const [newBoardName, setNewBoardName] = useState("")
  const [newBoardDescription, setNewBoardDescription] = useState("")
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchUserAndBoards()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Close dropdown when clicking outside and handle escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showUserDropdown) {
        const target = event.target as Element
        if (!target.closest('.user-dropdown')) {
          setShowUserDropdown(false)
        }
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showAddBoard) {
          setShowAddBoard(false)
          setNewBoardName("")
          setNewBoardDescription("")
        }
        if (showUserDropdown) {
          setShowUserDropdown(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showUserDropdown, showAddBoard])

  const fetchUserAndBoards = async () => {
    try {
      // Get user info first to check authentication
      const userResponse = await fetch("/api/user")
      if (userResponse.status === 401) {
        router.push("/auth/signin")
        return
      }
      
      if (userResponse.ok) {
        const userData = await userResponse.json()
        setUser(userData)
        
        // Check if user needs to complete profile setup
        if (!userData.name) {
          router.push("/setup/profile")
          return
        }
        
        // Check if user needs to complete organization setup
        if (!userData.organization) {
          router.push("/setup/organization")
          return
        }
      }

      // Fetch boards
      const boardsResponse = await fetch("/api/boards")
      if (boardsResponse.ok) {
        const { boards } = await boardsResponse.json()
        setBoards(boards)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddBoard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBoardName.trim()) return

    try {
      const response = await fetch("/api/boards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newBoardName,
          description: newBoardDescription,
        }),
      })

      if (response.ok) {
        const { board } = await response.json()
        setBoards([board, ...boards])
        setNewBoardName("")
        setNewBoardDescription("")
        setShowAddBoard(false)
      } else {
        const errorData = await response.json()
        alert(errorData.error || "Failed to create board")
      }
    } catch (error) {
      console.error("Error creating board:", error)
      alert("Failed to create board")
    }
  }

  const handleDeleteBoard = async (boardId: string) => {
    if (!confirm("Are you sure you want to delete this board?")) return

    try {
      const response = await fetch(`/api/boards/${boardId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setBoards(boards.filter(board => board.id !== boardId))
      } else {
        const errorData = await response.json()
        alert(errorData.error || "Failed to delete board")
      }
    } catch (error) {
      console.error("Error deleting board:", error)
      alert("Failed to delete board")
    }
  }

  const handleSignOut = async () => {
    await signOut()
  }

  if (loading) {
    return <FullPageLoader message="Loading dashboard..." />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Responsive Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="flex justify-between items-center h-16 px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-xl sm:text-2xl font-bold text-blue-600">Gumboard</h1>
            </div>
          </div>

          {/* Add Board Button and User Dropdown */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Button
              onClick={() => setShowAddBoard(true)}
              className="flex items-center space-x-1 sm:space-x-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 border-0 font-medium px-3 sm:px-4 py-2"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Board</span>
            </Button>
            
            <div className="relative user-dropdown">
                          <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-2 sm:px-3 py-2"
              >
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {user?.name ? user.name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium hidden sm:inline">
                  {user?.name?.split(' ')[0] || 'User'}
                </span>
                <ChevronDown className="w-4 h-4 ml-1 hidden sm:inline" />
              </button>

            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                <div className="py-1">
                  <div className="px-4 py-2 text-sm text-gray-500 border-b break-all overflow-hidden">
                    <span className="block truncate" title={user?.email}>
                      {user?.email}
                    </span>
                  </div>
                  <Link
                    href="/settings"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setShowUserDropdown(false)}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      </nav>

      {/* Enhanced Responsive Main Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {boards.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Boards</h2>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Manage your organization&apos;s boards
              </p>
            </div>
          </div>
        )}

        {/* Enhanced Responsive Add Board Modal */}
        {showAddBoard && (
          <div 
            className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowAddBoard(false)
              setNewBoardName("")
              setNewBoardDescription("")
            }}
          >
            <div 
              className="bg-white bg-opacity-95 backdrop-blur-md rounded-lg p-4 sm:p-6 w-full max-w-sm sm:max-w-md shadow-2xl drop-shadow-2xl border border-white border-opacity-30"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4">Create New Board</h3>
              <form onSubmit={handleAddBoard}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Board Name
                    </label>
                    <Input
                      type="text"
                      value={newBoardName}
                      onChange={(e) => setNewBoardName(e.target.value)}
                      placeholder="Enter board name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (Optional)
                    </label>
                    <Input
                      type="text"
                      value={newBoardDescription}
                      onChange={(e) => setNewBoardDescription(e.target.value)}
                      placeholder="Enter board description"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddBoard(false)
                      setNewBoardName("")
                      setNewBoardDescription("")
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Create Board</Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Enhanced Responsive Boards Grid */}
        {boards.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
            {/* All Notes Card */}
            <Card className="group hover:shadow-lg transition-shadow cursor-pointer border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
              <Link href="/boards/all-notes">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Grid3x3 className="w-5 h-5 text-blue-600" />
                        <CardTitle className="text-lg text-blue-900">All Notes</CardTitle>
                      </div>
                      <CardDescription className="text-blue-700">
                        View notes from all boards
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Link>
            </Card>
            
            {boards.map((board) => (
              <Card key={board.id} className="group hover:shadow-lg transition-shadow cursor-pointer">
                <Link href={`/boards/${board.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <CardTitle className="text-lg">{board.name}</CardTitle>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {board._count.notes} {board._count.notes === 1 ? 'note' : 'notes'}
                          </span>
                        </div>
                        {board.description && (
                          <CardDescription className="mt-1">
                            {board.description}
                          </CardDescription>
                        )}
                      </div>
                      {/* Only show delete button for board creator or admin */}
                      {(user?.id === board.createdBy || user?.isAdmin) && (
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleDeleteBoard(board.id)
                          }}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-1 rounded transition-opacity ml-2"
                          title={user?.id === board.createdBy ? "Delete board" : "Delete board (Admin)"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </CardHeader>
                </Link>
              </Card>
            ))}
          </div>
        )}

        {boards.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Plus className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No boards yet</h3>
            <p className="text-gray-500 mb-4">
              Get started by creating your first board
            </p>
            <Button onClick={() => setShowAddBoard(true)}>
              Create your first board
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}    