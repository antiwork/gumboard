import { usePolling } from "./usePolling";

interface UseBoardsListPollingOptions<T = { boards: unknown[] }> {
  enabled?: boolean;
  pollingInterval?: number;
  onUpdate?: (data: T) => void;
}

export function useBoardsListPolling<T = { boards: unknown[] }>({
  enabled = true,
  pollingInterval = 5000,
  onUpdate,
}: UseBoardsListPollingOptions<T> = {}) {
  return usePolling<T>({
    url: "/api/boards",
    enabled,
    interval: pollingInterval,
    onUpdate,
  });
}
