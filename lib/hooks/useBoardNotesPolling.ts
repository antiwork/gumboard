import { usePolling } from "./usePolling";

interface UseBoardNotesPollingOptions<T = { notes: unknown[] }> {
  boardId: string | null;
  enabled?: boolean;
  pollingInterval?: number;
  onUpdate?: (data: T) => void;
}

export function useBoardNotesPolling<T = { notes: unknown[] }>({
  boardId,
  enabled = true,
  pollingInterval = 4000,
  onUpdate,
}: UseBoardNotesPollingOptions<T>) {
  return usePolling<T>({
    url: boardId === "all-notes" ? "/api/boards/all-notes/notes" : `/api/boards/${boardId}/notes`,
    enabled: enabled && !!boardId,
    interval: pollingInterval,
    onUpdate,
  });
}
