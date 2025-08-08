"use client";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Settings,
  LogOut,
  ChevronDown,
  Grid3x3,
  Copy,
  Edit3,
  Archive,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FullPageLoader } from "@/components/ui/loader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { User, Board } from "@/components/note";

// Dashboard-specific extended types
export type DashboardBoard = Board & {
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  _count: { notes: number };
};

export default function Dashboard() {
  const [boards, setBoards] = useState<DashboardBoard[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddBoard, setShowAddBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardDescription, setNewBoardDescription] = useState("");
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    open: boolean;
    boardId: string;
    boardName: string;
  }>({ open: false, boardId: "", boardName: "" });
  const [errorDialog, setErrorDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
  }>({ open: false, title: "", description: "" });
  const [copiedBoardId, setCopiedBoardId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchUserAndBoards();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showUserDropdown) {
        const target = event.target as Element;
        if (!target.closest(".user-dropdown")) {
          setShowUserDropdown(false);
        }
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (showAddBoard) {
          setShowAddBoard(false);
          setNewBoardName("");
          setNewBoardDescription("");
          setEditingBoard(null);
        }
        if (showUserDropdown) {
          setShowUserDropdown(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showUserDropdown, showAddBoard]);

  const fetchUserAndBoards = async () => {
    try {
      const userResponse = await fetch("/api/user");
      if (userResponse.status === 401) {
        router.push("/auth/signin");
        return;
      }

      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser(userData);
        if (!userData.name) {
          router.push("/setup/profile");
          return;
        }
        if (!userData.organization) {
          router.push("/setup/organization");
          return;
        }
      }

      const boardsResponse = await fetch("/api/boards");
      if (boardsResponse.ok) {
        const { boards } = await boardsResponse.json();
        setBoards(boards);

      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardName.trim()) return;

    try {
      if (editingBoard) {
        const response = await fetch(`/api/boards/${editingBoard.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: newBoardName,
            description: newBoardDescription,
          }),
        });

        if (response.ok) {
          const { board } = await response.json();
          setBoards(boards.map((b) => (b.id === editingBoard.id ? board : b)));
          setNewBoardName("");
          setNewBoardDescription("");
          setEditingBoard(null);
          setShowAddBoard(false);
        } else {
          const errorData = await response.json();
          setErrorDialog({
            open: true,
            title: "Failed to update board",
            description: errorData.error || "Failed to update board",
          });
        }
      } else {
        const response = await fetch("/api/boards", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: newBoardName,
            description: newBoardDescription,
          }),
        });

        if (response.ok) {
          const { board } = await response.json();
          setBoards([board, ...boards]);
          setNewBoardName("");
          setNewBoardDescription("");
          setShowAddBoard(false);
        } else {
          const errorData = await response.json();
          setErrorDialog({
            open: true,
            title: "Failed to create board",
            description: errorData.error || "Failed to create board",
          });
        }
      }
    } catch (error) {
      console.error("Error with board:", error);
      setErrorDialog({
        open: true,
        title: editingBoard ? "Failed to update board" : "Failed to create board",
        description: editingBoard ? "Failed to update board" : "Failed to create board",
      });
    }
  };

  const handleEditBoard = (board: Board) => {
    setEditingBoard(board);
    setNewBoardName(board.name);
    setNewBoardDescription(board.description || "");
    setShowAddBoard(true);
  };

  const handleDeleteBoard = (boardId: string, boardName: string) => {
    setDeleteConfirmDialog({
      open: true,
      boardId,
      boardName,
    });
  };

  const confirmDeleteBoard = async () => {
    try {
      const response = await fetch(`/api/boards/${deleteConfirmDialog.boardId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setBoards(boards.filter((board) => board.id !== deleteConfirmDialog.boardId));
      } else {
        const errorData = await response.json();
        setErrorDialog({
          open: true,
          title: "Failed to delete board",
          description: errorData.error || "Failed to delete board",
        });
      }
    } catch (error) {
      console.error("Error deleting board:", error);
      setErrorDialog({
        open: true,
        title: "Failed to delete board",
        description: "Failed to delete board",
      });
    }
  };

  const handleTogglePublic = async (boardId: string, isPublic: boolean) => {
    try {
      const response = await fetch(`/api/boards/${boardId}/public`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isPublic }),
      });

      if (response.ok) {
        setBoards(boards.map((board) => 
          board.id === boardId ? { ...board, isPublic } : board
        ));
      } else {
        const errorData = await response.json();
        setErrorDialog({
          open: true,
          title: "Failed to update board",
          description: errorData.error || "Failed to update board settings",
        });
      }
    } catch (error) {
      console.error("Error updating board:", error);
    }
  };

  const handleCopyPublicUrl = async (boardId: string) => {
    const publicUrl = `${window.location.origin}/public/boards/${boardId}`;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopiedBoardId(boardId);
      setTimeout(() => setCopiedBoardId(null), 2000);
    } catch (error) {
      console.error("Failed to copy URL:", error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading) {
    return <FullPageLoader message="Loading dashboard..." />;
  }

  return (
    <div className="min-h-screen bg-background dark:bg-zinc-950">
      <nav className="bg-card dark:bg-zinc-900 border-b border-border dark:border-zinc-800 shadow-sm">
        <div className="flex justify-between items-center h-16 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                Gumboard
              </h1>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Button
              onClick={() => setShowAddBoard(true)}
              className="flex items-center space-x-1 sm:space-x-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 border-0 font-medium px-3 sm:px-4 py-2 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Board</span>
            </Button>
            <div className="relative user-dropdown">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center space-x-2 text-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-2 sm:px-3 py-2 dark:text-zinc-100"
              >
                <div className="w-8 h-8 bg-blue-500 dark:bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {user?.name
                      ? user.name.charAt(0).toUpperCase()
                      : user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium hidden sm:inline">
                  {user?.name?.split(" ")[0] || "User"}
                </span>
                <ChevronDown className="w-4 h-4 ml-1 hidden sm:inline" />
              </button>
              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-zinc-900 rounded-md shadow-lg border border-border dark:border-zinc-800 z-50">
                  <div className="py-1">
                    <div className="px-4 py-2 text-sm text-muted-foreground dark:text-zinc-400 border-b dark:border-zinc-800 break-all overflow-hidden">
                      <span className="block truncate" title={user?.email}>
                        {user?.email}
                      </span>
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
        </div>
      </nav>
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {boards.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground dark:text-zinc-100">
                Boards
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground dark:text-zinc-400 mt-1">
                Manage your organization&apos;s boards
              </p>
            </div>
          </div>
        )}
        {showAddBoard && (
          <div
            className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/40 dark:bg-black/70 backdrop-blur-sm"
            onClick={() => {
              setShowAddBoard(false);
              setNewBoardName("");
              setNewBoardDescription("");
              setEditingBoard(null);
            }}
          >
            <div
              className="bg-white dark:bg-zinc-950 bg-opacity-95 dark:bg-opacity-95 rounded-xl p-5 sm:p-7 w-full max-w-sm sm:max-w-md shadow-2xl border border-border dark:border-zinc-800"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4 text-foreground dark:text-zinc-100">
                {editingBoard ? "Edit Board" : "Create New Board"}
              </h3>
              <form onSubmit={handleAddBoard}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground dark:text-zinc-200 mb-1">
                      Board Name
                    </label>
                    <Input
                      type="text"
                      value={newBoardName}
                      onChange={(e) => setNewBoardName(e.target.value)}
                      placeholder="Enter board name"
                      required
                      autoFocus
                      className="bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100 border border-border dark:border-zinc-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground dark:text-zinc-200 mb-1">
                      Description (Optional)
                    </label>
                    <Input
                      type="text"
                      value={newBoardDescription}
                      onChange={(e) => setNewBoardDescription(e.target.value)}
                      placeholder="Enter board description"
                      className="bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100 border border-border dark:border-zinc-700"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddBoard(false);
                      setNewBoardName("");
                      setNewBoardDescription("");
                      setEditingBoard(null);
                    }}
                    className="bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100 border border-border dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600 dark:text-zinc-100"
                  >
                    {editingBoard ? "Update board" : "Create board"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {boards.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
            <Card className="group hover:shadow-lg transition-shadow cursor-pointer border-2 border-blue-200 dark:border-blue-900 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-zinc-900 dark:to-zinc-950">
              <Link href="/boards/all-notes">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Grid3x3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <CardTitle className="text-lg text-blue-900 dark:text-blue-200">
                          All Notes
                        </CardTitle>
                      </div>
                      <CardDescription className="text-blue-700 dark:text-blue-300">
                        View notes from all boards
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Link>
            </Card>

            {/* Archive Board */}
            <Card className="group hover:shadow-lg transition-shadow cursor-pointer bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
              <Link href="/boards/archive">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Archive className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        <CardTitle className="text-lg text-gray-900 dark:text-gray-200">
                          Archive
                        </CardTitle>
                      </div>
                      <CardDescription className="text-gray-700 dark:text-gray-300">
                        View archived notes
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Link>
            </Card>

            {boards.map((board) => (
              <Card
                key={board.id}
                className="group hover:shadow-lg transition-shadow cursor-pointer dark:bg-zinc-900 dark:border-zinc-800"
              >
                <Link href={`/boards/${board.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <CardTitle className="text-lg dark:text-zinc-100">
                            {board.name}
                          </CardTitle>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {board._count.notes}{" "}
                            {board._count.notes === 1 ? "note" : "notes"}
                          </span>
                        </div>
                        {board.description && (
                          <CardDescription className="mt-1 dark:text-zinc-400">
                            {board.description}
                          </CardDescription>
                        )}
                        
                        <div className="mt-3 flex items-center justify-between" onClick={(e) => e.preventDefault()}>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={board.isPublic}
                              onCheckedChange={(checked) => handleTogglePublic(board.id, checked)}
                              disabled={user?.id !== board.createdBy && !user?.isAdmin}
                            />
                            <span className="text-xs text-muted-foreground dark:text-zinc-400">
                              {board.isPublic ? "Public" : "Private"}
                            </span>
                          </div>
                          
                          {board.isPublic && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleCopyPublicUrl(board.id);
                              }}
                              className="flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                              title="Copy public link"
                            >
                              {copiedBoardId === board.id ? (
                                <>
                                  <span>✓</span>
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy link</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                      {(user?.id === board.createdBy || user?.isAdmin) && (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleEditBoard(board);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground dark:text-zinc-400 hover:text-blue-500 dark:hover:text-blue-400 p-1 rounded transition-opacity"
                            title={
                              user?.id === board.createdBy
                                ? "Edit board"
                                : "Edit board (Admin)"
                            }
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteBoard(board.id, board.name);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 p-1 rounded transition-opacity"
                            title={
                              user?.id === board.createdBy
                                ? "Delete board"
                                : "Delete board (Admin)"
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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
            <div className="text-muted-foreground dark:text-zinc-400 mb-4">
              <Plus className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-foreground dark:text-zinc-100 mb-2">
              No boards yet
            </h3>
            <p className="text-muted-foreground dark:text-zinc-400 mb-4">
              Get started by creating your first board
            </p>
            <Button
              onClick={() => setShowAddBoard(true)}
              className="dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              Create your first board
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={deleteConfirmDialog.open} onOpenChange={(open) => setDeleteConfirmDialog({ open, boardId: "", boardName: "" })}>
        <AlertDialogContent className="bg-white dark:bg-zinc-950 border border-border dark:border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground dark:text-zinc-100">
              Delete board
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground dark:text-zinc-400">
              Are you sure you want to delete &quot;{deleteConfirmDialog.boardName}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100 border border-border dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteBoard}
              className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700"
            >
              Delete board
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={errorDialog.open} onOpenChange={(open) => setErrorDialog({ open, title: "", description: "" })}>
        <AlertDialogContent className="bg-white dark:bg-zinc-950 border border-border dark:border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground dark:text-zinc-100">
              {errorDialog.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground dark:text-zinc-400">
              {errorDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setErrorDialog({ open: false, title: "", description: "" })}
              className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700"
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
