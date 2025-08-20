"use client";

import { useState, forwardRef, useImperativeHandle } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Copy } from "lucide-react";
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

interface BoardSettings {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  sendSlackUpdates: boolean;
}

interface BoardSettingsModalProps {
  onBoardUpdate?: (updatedBoard: BoardSettings & { createdAt?: string; updatedAt?: string }) => void;
  onBoardDelete?: (boardId: string) => void;
  redirectAfterDelete?: string;
}

export interface BoardSettingsModalRef {
  openBoardSettings: (board: {
    id: string;
    name: string;
    description?: string;
    isPublic?: boolean;
    sendSlackUpdates?: boolean;
  }) => void;
}

export const BoardSettingsModal = forwardRef<BoardSettingsModalRef, BoardSettingsModalProps>(
  ({ onBoardUpdate, onBoardDelete, redirectAfterDelete }, ref) => {
  const router = useRouter();
  
  const [open, setOpen] = useState(false);
  const [boardSettings, setBoardSettings] = useState<BoardSettings>({
    id: "",
    name: "",
    description: "",
    isPublic: false,
    sendSlackUpdates: true,
  });
  const [copiedPublicUrl, setCopiedPublicUrl] = useState(false);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState(false);
  const [errorDialog, setErrorDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
  }>({ open: false, title: "", description: "" });

  const openBoardSettings = (board: {
    id: string;
    name: string;
    description?: string;
    isPublic?: boolean;
    sendSlackUpdates?: boolean;
  }) => {
    setBoardSettings({
      id: board.id,
      name: board.name,
      description: board.description || "",
      isPublic: board.isPublic ?? false,
      sendSlackUpdates: board.sendSlackUpdates ?? true,
    });
    setOpen(true);
  };

  useImperativeHandle(ref, () => ({
    openBoardSettings,
  }));

  const handleUpdateBoardSettings = async (settings: {
    name: string;
    description: string;
    isPublic: boolean;
    sendSlackUpdates: boolean;
  }) => {
    try {
      const response = await fetch(`/api/boards/${boardSettings.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        const { board } = await response.json();
        setOpen(false);
        onBoardUpdate?.(board);
      } else {
        const errorData = await response.json();
        setErrorDialog({
          open: true,
          title: "Failed to update board",
          description: errorData.error || "Failed to update board",
        });
      }
    } catch (error) {
      console.error("Error updating board settings:", error);
      setErrorDialog({
        open: true,
        title: "Failed to update board",
        description: "Failed to update board",
      });
    }
  };

  const handleDeleteBoard = async () => {
    try {
      const response = await fetch(`/api/boards/${boardSettings.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setOpen(false);
        onBoardDelete?.(boardSettings.id);
        if (redirectAfterDelete) {
          router.push(redirectAfterDelete);
        }
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

  const handleCopyPublicUrl = async () => {
    const publicUrl = `${window.location.origin}/public/boards/${boardSettings.id}`;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopiedPublicUrl(true);
      setTimeout(() => setCopiedPublicUrl(false), 2000);
    } catch (error) {
      console.error("Failed to copy URL:", error);
    }
  };

  const handleSave = () => {
    handleUpdateBoardSettings({
      name: boardSettings.name,
      description: boardSettings.description,
      isPublic: boardSettings.isPublic,
      sendSlackUpdates: boardSettings.sendSlackUpdates,
    });
  };

  const handleDelete = () => {
    setDeleteConfirmDialog(false);
    handleDeleteBoard();
  };

  const handleDeleteClick = () => {
    setDeleteConfirmDialog(true);
  };

  return (
    <>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 p-4 lg:p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground dark:text-zinc-100">
              Board settings
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground dark:text-zinc-400">
              Configure settings for &quot;{boardSettings.name}&quot; board.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground dark:text-zinc-200 mb-1">
                Board name
              </label>
              <Input
                type="text"
                value={boardSettings.name}
                onChange={(e) => setBoardSettings({ ...boardSettings, name: e.target.value })}
                placeholder="Enter board name"
                className="bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100 border border-gray-200 dark:border-zinc-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground dark:text-zinc-200 mb-1">
                Description (optional)
              </label>
              <Input
                type="text"
                value={boardSettings.description}
                onChange={(e) =>
                  setBoardSettings({ ...boardSettings, description: e.target.value })
                }
                placeholder="Enter board description"
                className="bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100 border border-gray-200 dark:border-zinc-700"
              />
            </div>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isPublic"
                  checked={boardSettings.isPublic}
                  onCheckedChange={(checked) =>
                    setBoardSettings({ ...boardSettings, isPublic: checked as boolean })
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
                        {typeof window !== "undefined"
                          ? `${window.location.origin}/public/boards/${boardSettings.id}`
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
                  setBoardSettings({ ...boardSettings, sendSlackUpdates: checked as boolean })
                }
                className="border-slate-500 bg-white/50 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-600 mt-1"
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
              onClick={handleDeleteClick}
              variant="destructive"
              className="mr-auto bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4" />
              Delete <span className="hidden lg:inline">Board</span>
            </Button>
            <div className="flex space-x-2 items-center">
              <AlertDialogCancel className="border-gray-400 text-foreground dark:text-zinc-100 dark:border-zinc-700 hover:bg-zinc-100 hover:text-foreground hover:border-gray-200 dark:hover:bg-zinc-800">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleSave}
                className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600 dark:text-white"
              >
                Save settings
              </AlertDialogAction>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmDialog} onOpenChange={setDeleteConfirmDialog}>
        <AlertDialogContent className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground dark:text-zinc-100">
              Delete Board
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground dark:text-zinc-400">
              Are you sure you want to delete &quot;{boardSettings.name}&quot;? This action cannot
              be undone and will permanently delete all notes in this board.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100 border border-gray-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700"
            >
              Delete Board
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
              className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600 dark:text-white"
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});

BoardSettingsModal.displayName = "BoardSettingsModal";
