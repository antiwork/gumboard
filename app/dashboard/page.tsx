"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import z from "zod";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { BetaBadge } from "@/components/ui/beta-badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { Plus, Grid3x3, Archive, EllipsisVertical, Trash2, Copy } from "lucide-react";
import { useRouter } from "next/navigation";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { Skeleton } from "@/components/ui/skeleton";
import { formatLastActivity } from "@/lib/utils";

// Dashboard-specific extended types
export type DashboardBoard = Board & {
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  sendSlackUpdates?: boolean;
  lastActivityAt: string;
  _count: { notes: number };
};

const formSchema = z.object({
  name: z
    .string()
    .min(1, "Board name is required")
    .refine((value) => value.trim().length > 0, "Board name cannot be empty"),
  description: z.string().optional(),
});

export default function Dashboard() {
  const [boards, setBoards] = useState<DashboardBoard[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddBoardDialogOpen, setIsAddBoardDialogOpen] = useState(false);
  const [boardSettingsDialog, setBoardSettingsDialog] = useState(false);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<DashboardBoard | null>(null);
  const [copiedPublicUrl, setCopiedPublicUrl] = useState(false);
  const [boardSettings, setBoardSettings] = useState({
    name: "",
    description: "",
    isPublic: false,
    sendSlackUpdates: true,
  });

  const [errorDialog, setErrorDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
  }>({ open: false, title: "", description: "" });

  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const fetchUserAndBoards = useCallback(async () => {
    try {
      const [userResponse, boardsResponse] = await Promise.all([
        fetch("/api/user"),
        fetch("/api/boards"),
      ]);

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

      if (boardsResponse.ok) {
        const { boards } = await boardsResponse.json();
        setBoards(boards);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setErrorDialog({
        open: true,
        title: "Failed to load dashboard",
        description:
          "Unable to fetch your boards and user data. Please refresh the page or try again later.",
      });
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchUserAndBoards();
  }, [fetchUserAndBoards]);

  const handleOpenBoardSettings = (board: DashboardBoard, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedBoard(board);
    setBoardSettings({
      name: board.name,
      description: board.description || "",
      isPublic: board.isPublic,
      sendSlackUpdates: board.sendSlackUpdates ?? true,
    });
    setBoardSettingsDialog(true);
  };

  const handleUpdateBoardSettings = async (settings: {
    name?: string;
    description?: string;
    isPublic?: boolean;
    sendSlackUpdates: boolean;
  }) => {
    if (!selectedBoard) return;

    try {
      const response = await fetch(`/api/boards/${selectedBoard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        const { board } = await response.json();
        setBoards((prevBoards) => prevBoards.map((b) => (b.id === board.id ? board : b)));
        setBoardSettings({
          name: board.name,
          description: board.description || "",
          isPublic: board.isPublic,
          sendSlackUpdates: board.sendSlackUpdates ?? true,
        });
        setBoardSettingsDialog(false);
      }
    } catch (error) {
      console.error("Error updating board settings:", error);
    }
  };

  const handleCopyPublicUrl = async () => {
    if (!selectedBoard) return;

    const publicUrl = `${window.location.origin}/public/boards/${selectedBoard.id}`;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopiedPublicUrl(true);
      setTimeout(() => setCopiedPublicUrl(false), 2000);
    } catch (error) {
      console.error("Failed to copy URL:", error);
    }
  };

  const handleDeleteBoard = async () => {
    if (!selectedBoard) return;

    try {
      const response = await fetch(`/api/boards/${selectedBoard.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setBoards((prevBoards) => prevBoards.filter((b) => b.id !== selectedBoard.id));
        setDeleteConfirmDialog(false);
        setBoardSettingsDialog(false);
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
    setDeleteConfirmDialog(false);
  };

  const handleAddBoard = async (values: z.infer<typeof formSchema>) => {
    const { name, description } = values;
    const trimmedName = name.trim();
    try {
      const response = await fetch("/api/boards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
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
    } catch (error) {
      console.error("Error adding board:", error);
      setErrorDialog({
        open: true,
        title: "Failed to create board",
        description: "Failed to create board",
      });
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsAddBoardDialogOpen(open);
    if (!open) {
      form.reset();
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950">
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
              }}
              className="flex items-center space-x-1 sm:space-x-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 border-0 font-medium px-3 sm:px-4 py-2 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <div className="flex justify-between items-center sm:space-x-2">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Board</span>
              </div>
            </Button>

            <ProfileDropdown user={user} />
          </div>
        </div>
      </nav>
      <div className="p-4 sm:p-6 lg:p-8">
        <Dialog open={isAddBoardDialogOpen} onOpenChange={handleOpenChange}>
          <DialogContent className="bg-white dark:bg-zinc-950  sm:max-w-[425px] ">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold mb-4 text-foreground dark:text-zinc-100">
                Create New Board
              </DialogTitle>
              <DialogDescription className="text-muted-foreground dark:text-zinc-400">
                Fill out the details to create a new board.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form className="space-y-4" onSubmit={form.handleSubmit(handleAddBoard)}>
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
                    Create board
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {boards.length > 0 && (
          <>
            <div className="mb-8">
              <h3 className="text-lg font-medium text-foreground dark:text-zinc-100 mb-2">
                Your Boards
              </h3>
              <p className="text-muted-foreground dark:text-zinc-400">
                Manage your tasks and notes across different boards
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
              <Link href="/boards/all-notes">
                <Card className="group h-full min-h-34 hover:shadow-lg transition-shadow cursor-pointer border-2 border-blue-200 dark:border-blue-900 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-zinc-900 dark:to-zinc-950 dark:hover:bg-zinc-900/75">
                  <CardHeader>
                    <div className="flex items-center space-x-2">
                      <Grid3x3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <CardTitle className="text-lg text-blue-900 dark:text-blue-200">
                        All Notes
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-blue-700 dark:text-blue-300 truncate">
                      View notes from all boards
                    </p>
                  </CardContent>
                </Card>
              </Link>

              {/* Archive Board */}
              <Link href="/boards/archive">
                <Card className="group h-full min-h-34 hover:shadow-lg transition-shadow cursor-pointer bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 dark:hover:bg-zinc-900/75">
                  <CardHeader>
                    <div className="flex items-center space-x-2">
                      <Archive className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      <CardTitle className="text-lg text-gray-900 dark:text-gray-200">
                        Archive
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 dark:text-gray-300 truncate">View archived notes</p>
                  </CardContent>
                </Card>
              </Link>

              {boards.map((board) => (
                <div key={board.id} className="relative">
                  <Card
                    data-board-id={board.id}
                    className="group h-full min-h-34 hover:shadow-lg transition-shadow cursor-pointer whitespace-nowrap bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800"
                  >
                    <div
                      className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleOpenBoardSettings(board, e);
                      }}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Board settings"
                        title="Board settings"
                        className="flex items-center size-8"
                        tabIndex={0}
                      >
                        <EllipsisVertical className="size-4" />
                      </Button>
                    </div>
                    <Link href={`/boards/${board.id}`} className="block focus:outline-none">
                      <CardHeader>
                        <div className="grid grid-cols-[1fr_auto] items-start justify-between gap-2">
                          <CardTitle
                            className="text-lg dark:text-zinc-100 truncate"
                            title={board.name}
                          >
                            {board.name}
                          </CardTitle>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 mt-0.5">
                            {board._count.notes} {board._count.notes === 1 ? "note" : "notes"}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {board.description && (
                          <p className="text-slate-600 dark:text-zinc-300 truncate mb-2">
                            {board.description}
                          </p>
                        )}
                        <p className="text-xs text-slate-500 dark:text-zinc-400">
                          Last active: {formatLastActivity(board.lastActivityAt)}
                        </p>
                      </CardContent>
                    </Link>
                  </Card>
                </div>
              ))}
            </div>
          </>
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
                form.reset({ name: "", description: "" });
              }}
              className="dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              Create your first board
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={boardSettingsDialog} onOpenChange={setBoardSettingsDialog}>
        <AlertDialogContent className="board-settings-modal bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 p-4 lg:p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground dark:text-zinc-100">
              Board settings
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground dark:text-zinc-400">
              Configure settings for &quot;{selectedBoard?.name}&quot; board.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-foreground dark:text-zinc-100">
                Board name
              </label>
              <Input
                value={boardSettings.name}
                onChange={(e) => setBoardSettings((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Enter board name"
                className="mt-1 bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100 border border-gray-200 dark:border-zinc-700"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground dark:text-zinc-100">
                Description (optional)
              </label>
              <Input
                value={boardSettings.description}
                onChange={(e) =>
                  setBoardSettings((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Enter board description"
                className="mt-1 bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100 border border-gray-200 dark:border-zinc-700"
              />
            </div>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isPublic"
                  checked={boardSettings.isPublic}
                  onCheckedChange={(checked) =>
                    setBoardSettings((prev) => ({ ...prev, isPublic: checked as boolean }))
                  }
                />
                <label
                  htmlFor="isPublic"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground dark:text-zinc-100"
                >
                  Make board public
                </label>
              </div>
              <p className="text-xs text-muted-foreground dark:text-zinc-400 mt-1 ml-6">
                When enabled, anyone with the link can view this board
              </p>

              {boardSettings.isPublic && (
                <div className="ml-6 p-3 bg-gray-50 dark:bg-zinc-800 rounded-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground dark:text-zinc-100">
                        Public link
                      </p>
                      <p className="text-xs text-muted-foreground dark:text-zinc-400 break-all">
                        {typeof window !== "undefined" && selectedBoard
                          ? `${window.location.origin}/public/boards/${selectedBoard.id}`
                          : ""}
                      </p>
                    </div>
                    <Button
                      onClick={handleCopyPublicUrl}
                      size="sm"
                      variant="outline"
                      className="ml-3 flex items-center space-x-1"
                    >
                      {copiedPublicUrl ? (
                        <>
                          <span className="text-xs">✓</span>
                          <span className="text-xs">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span className="text-xs">Copy</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="sendSlackUpdates"
                checked={boardSettings.sendSlackUpdates}
                onCheckedChange={(checked) =>
                  setBoardSettings((prev) => ({ ...prev, sendSlackUpdates: checked as boolean }))
                }
                className="border-slate-500 bg-white/50 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-600"
              />
              <label
                htmlFor="sendSlackUpdates"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground dark:text-zinc-100"
              >
                Send updates to Slack
              </label>
            </div>
            <p className="text-xs text-muted-foreground dark:text-zinc-400 mt-1 ml-6">
              When enabled, note updates will be sent to your organization&apos;s Slack channel
            </p>
          </div>

          <AlertDialogFooter className="flex !flex-row justify-between">
            <Button
              onClick={() => setDeleteConfirmDialog(true)}
              variant="destructive"
              className="mr-auto flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden lg:inline">Delete Board</span>
            </Button>
            <div className="flex space-x-2 items-center">
              <AlertDialogCancel className="border-gray-400 text-foreground dark:text-zinc-100 dark:border-zinc-700 hover:bg-zinc-100 hover:text-foreground hover:border-gray-200 dark:hover:bg-zinc-800">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleUpdateBoardSettings(boardSettings)}
                className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600 dark:text-white"
              >
                Save settings
              </AlertDialogAction>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteConfirmDialog} onOpenChange={setDeleteConfirmDialog}>
        <AlertDialogContent className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground dark:text-zinc-100">
              Delete Board
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground dark:text-zinc-400">
              Are you sure you want to delete &quot;{selectedBoard?.name}&quot;? This action cannot
              be undone and will permanently delete all notes in this board.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100 border border-gray-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBoard}
              className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700"
            >
              Delete Board
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={errorDialog.open}
        onOpenChange={(open) => setErrorDialog({ open, title: "", description: "" })}
      >
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

const DashboardSkeleton = () => {
  const skeletonBoardCount = 5;
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950">
      <nav className="bg-card dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 shadow-sm">
        <div className="flex justify-between items-center h-16 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Skeleton className="h-8 w-32" />
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      </nav>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="space-y-4 mb-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-6 w-84" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
          {Array.from({ length: skeletonBoardCount }).map((_, i) => (
            <div
              key={i}
              className="h-full min-h-34 bg-white dark:bg-zinc-900 shadow-sm p-4 rounded-sm flex flex-col justify-between"
            >
              <div>
                <Skeleton className="h-8 w-32 mb-8" />
                <Skeleton className="h-6 w-64" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
