"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import z from "zod";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { BetaBadge } from "@/components/ui/beta-badge";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { Plus, Grid3x3, Archive } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
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

// Dashboard-specific extended types
export type DashboardBoard = Board & {
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
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
                <Link href={`/boards/${board.id}`} key={board.id}>
                  <Card
                    data-board-id={board.id}
                    className="group h-full min-h-34 hover:shadow-lg transition-shadow cursor-pointer whitespace-nowrap bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800"
                  >
                    <CardHeader>
                      <div className="grid grid-cols-[1fr_auto] items-start justify-between gap-2">
                        <CardTitle className="text-lg dark:text-zinc-100" title={board.name}>
                          {board.name}
                        </CardTitle>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 mt-0.5">
                          {board._count.notes} {board._count.notes === 1 ? "note" : "notes"}
                        </span>
                      </div>
                    </CardHeader>
                    {board.description && (
                      <CardContent>
                        <p className="text-slate-600 dark:text-zinc-300 truncate">
                          {board.description}
                        </p>
                      </CardContent>
                    )}
                  </Card>
                </Link>
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
