"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface BoardSettingsState {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  sendSlackUpdates: boolean;
}

interface UseBoardSettingsOptions {
  onBoardUpdate?: (
    updatedBoard: BoardSettingsState & { createdAt?: string; updatedAt?: string }
  ) => void;
  onBoardDelete?: (boardId: string) => void;
  redirectAfterDelete?: string;
}

export function useBoardSettings(options: UseBoardSettingsOptions = {}) {
  const { onBoardUpdate, onBoardDelete, redirectAfterDelete } = options;
  const router = useRouter();

  const [boardSettingsDialog, setBoardSettingsDialog] = useState(false);
  const [boardSettings, setBoardSettings] = useState<BoardSettingsState>({
    id: "",
    name: "",
    description: "",
    isPublic: false,
    sendSlackUpdates: true,
  });
  const [copiedPublicUrl, setCopiedPublicUrl] = useState(false);
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
    setBoardSettingsDialog(true);
  };

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
        setBoardSettingsDialog(false);
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
        setBoardSettingsDialog(false);
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

  return {
    // State
    boardSettingsDialog,
    setBoardSettingsDialog,
    boardSettings,
    setBoardSettings,
    copiedPublicUrl,
    errorDialog,
    setErrorDialog,

    // Actions
    openBoardSettings,
    handleUpdateBoardSettings,
    handleDeleteBoard,
    handleCopyPublicUrl,
  };
}
