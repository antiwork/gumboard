"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import z from "zod";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button"
import { BetaBadge } from "@/components/ui/beta-badge";
import { Input } from "@/components/ui/input";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Settings,
  LogOut,
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
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Dashboard-specific extended types
export type DashboardBoard = Board & {
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  _count: { notes: number };
};

const formSchema = z.object({
  name: z.string().min(1, "Board name is required"),
  description: z.string().optional(),
});

export default function Dashboard() {
  const [boards, setBoards] = useState<DashboardBoard[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddBoardDialogOpen, setIsAddBoardDialogOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: ""
    }
  })

  useEffect(() => {
    fetchUserAndBoards();
  }, []);

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

  const handleAddBoard = async (values: z.infer<typeof formSchema>) => {
    const {name, description} = values;
    try {
      if (editingBoard) {
        const response = await fetch(`/api/boards/${editingBoard.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            description,
          })
        })

        if (response.ok) {
          const { board } = await response.json();
          setBoards(boards.map((b) => (b.id === editingBoard.id ? board : b)));
          form.reset();
          setIsAddBoardDialogOpen(false);
          setEditingBoard(null);
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
            name,
            description,
          }),
        });

        if (response.ok) {
          const { board } = await response.json();
          setBoards([board, ...boards]);
          form.reset();
          setIsAddBoardDialogOpen(false);
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
      console.error("Error adding board:", error);
      setErrorDialog({
        open: true,
        title: editingBoard ? "Failed to update board" : "Failed to create board",
        description: editingBoard ? "Failed to update board" : "Failed to create board",
      })
    }
  };

  const handleEditBoard = (board: DashboardBoard) => {
    setEditingBoard(board);
    form.reset({
      name: board.name,
      description: board.description || "",
    });
    setIsAddBoardDialogOpen(true);
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

  const handleOpenChange = (open: boolean) => {
    setIsAddBoardDialogOpen(open)
    // Reset form and editing state when the dialog closes
    if (!open) {
      form.reset();
      setEditingBoard(null);
    }
  }

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading) {
    return <FullPageLoader message="Loading dashboard..." />;
  }

  return (
    <div className="min-h-screen bg-background dark:bg-zinc-950">
      <nav className="bg-card dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 shadow-sm">
        <div className="flex justify-between items-center h-16 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                Gumboard
                <BetaBadge />
              </h1>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Button
              onClick={() => {
                form.reset({ name: "", description: "" });
                setIsAddBoardDialogOpen(true);
                setEditingBoard(null); 
              }}
              className="flex items-center space-x-1 sm:space-x-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 border-0 font-medium px-3 sm:px-4 py-2 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Board</span>
            </Button>
            <Popover>
               <PopoverTrigger asChild>
                    <Avatar className="w-9 h-9 cursor-pointer">
                    <div className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors ">
                    <AvatarImage className="w-7 h-7 rounded-full" src={user?.image || ""} alt={user?.name || ""} />
                    <AvatarFallback className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-900 dark:text-zinc-100 bg-blue-500 ">
                        <span className="text-sm font-medium text-white">
                          {user?.name
                            ? user.name.charAt(0).toUpperCase()
                            : user?.email?.charAt(0).toUpperCase()}
                        </span>
                      </AvatarFallback>
                    </div>
                    </Avatar>
               </PopoverTrigger>
               <PopoverContent className="w-80 bg-white dark:bg-zinc-900"> 
                    <div>
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">
                            {user?.name || user?.email}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {user?.email}
                        </p>
                        <Link href={"/settings"} className="flex items-center mt-4 hover:bg-zinc-200 dark:hover:bg-zinc-800  pl-2 dark:hover:text-zinc-50 text-zinc-800 dark:text-zinc-400 rounded-md text-sm gap-2 py-2">
                          <Settings size={19} />
                            Settings
                        </Link>

                        <div onClick={handleSignOut} className="flex items-center mt-2 group hover:bg-zinc-200 dark:hover:bg-zinc-800 pl-2 text-red-700 dark:hover:text-red-500 rounded-md cursor-pointer text-sm gap-2 py-2">
                          <LogOut size={19} />
                              Sign Out
                        </div>
                    </div>
               </PopoverContent>
            </Popover>
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
        
        <Dialog open={isAddBoardDialogOpen} onOpenChange={handleOpenChange}>
          <DialogContent className="bg-white dark:bg-zinc-950 border border-zinc-800 dark:border-zinc-800 sm:max-w-[425px] ">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold mb-4 text-foreground dark:text-zinc-100">
                {editingBoard ? "Edit Board" : "Create New Board"}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground dark:text-zinc-400">
                {editingBoard
                  ? "Update the board's name and description."
                  : "Fill out the details to create a new board."}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form 
                className="space-y-4"
                onSubmit={form.handleSubmit(handleAddBoard)}>
                  <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Board Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter board name"
                          className="border border-zinc-200 dark:border-zinc-800 text-muted-foreground dark:text-zinc-200"
                          autoFocus
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs text-red-600" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter board description"
                          className="border border-zinc-200 dark:border-zinc-800 text-muted-foreground dark:text-zinc-200"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                    {editingBoard ? "Update board" : "Create board"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {boards.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
            <Link href="/boards/all-notes">
              <Card className="group hover:shadow-lg transition-shadow cursor-pointer border-2 border-blue-200 dark:border-blue-900 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-zinc-900 dark:to-zinc-950 dark:hover:bg-zinc-900/75">
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
              </Card>
            </Link>

            {/* Archive Board */}
            <Link href="/boards/archive">
              <Card className="group hover:shadow-lg transition-shadow cursor-pointer bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 dark:hover:bg-zinc-900/75">
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
              </Card>
            </Link>

            {boards.map((board) => (
              <Link href={`/boards/${board.id}`} key={board.id}>
                <Card className="group hover:shadow-lg transition-shadow cursor-pointer bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 dark:hover:bg-zinc-900/75 h-40">
                  <CardHeader className="pb-3 flex flex-col h-full">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <CardTitle className="text-lg  w-3/4 dark:text-zinc-100">
                            {board.name}
                          </CardTitle>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {board._count.notes}{" "}
                            {board._count.notes === 1 ? "note" : "notes"}
                          </span>
                        </div>
                        {(user?.id === board.createdBy || user?.isAdmin) && (
                        <div className="flex justify-end items-center space-x-1">
                          <Button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleEditBoard(board);
                            }}
                            className="md:opacity-0 md:group-hover:opacity-100 text-muted-foreground dark:text-zinc-400 hover:text-blue-500 dark:hover:text-blue-400 p-1 rounded transition-opacity"
                            title={
                              user?.id === board.createdBy
                                ? "Edit board"
                                : "Edit board (Admin)"
                            }
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteBoard(board.id, board.name);
                            }}
                            className="md:opacity-0 md:group-hover:opacity-100 text-muted-foreground dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 p-1 rounded transition-opacity"
                            title={
                              user?.id === board.createdBy
                                ? "Delete board"
                                : "Delete board (Admin)"
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                        {board.description && (
                          <CardDescription className="mt-1 dark:text-zinc-400 line-clamp-2 text-sm">
                            {board.description}
                          </CardDescription>
                        )}
                      </div>
                        
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center space-x-2" onClick={(e) => e.preventDefault()}>
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
                          <Button
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
                          </Button>
                        )}
                      </div>
                  </CardHeader>
                </Card>
              </Link>
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
              onClick={() => {
                setIsAddBoardDialogOpen(true);
                form.reset({name: "", description: ""});
              }}
              className="dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              Create your first board
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={deleteConfirmDialog.open} onOpenChange={(open) => setDeleteConfirmDialog({ open, boardId: "", boardName: "" })}>
        <AlertDialogContent className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground dark:text-zinc-100">
              Delete board
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground dark:text-zinc-400">
              Are you sure you want to delete &quot;{deleteConfirmDialog.boardName}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100 border border-gray-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800">
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
        <AlertDialogContent className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800">
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
