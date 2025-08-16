import { useEffect, useRef, useState, useCallback } from "react";

const ACTIVITY_THRESHOLD = 30000;
const MAX_BACKOFF_INTERVAL = 10000;
const BACKOFF_MULTIPLIER = 2;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_BASE = 1000;

interface UsePollingOptions<T = unknown> {
  url: string;
  enabled?: boolean;
  interval?: number;
  onUpdate?: (data: T) => void;
}

const getAdaptiveInterval = (timeSinceActivity: number, baseInterval: number): number => {
  return timeSinceActivity > ACTIVITY_THRESHOLD
    ? Math.min(baseInterval * BACKOFF_MULTIPLIER, MAX_BACKOFF_INTERVAL)
    : baseInterval;
};

export function usePolling<T = unknown>({
  url,
  enabled = true,
  interval = 5000,
  onUpdate,
}: UsePollingOptions<T>) {
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTabActiveRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastActivityRef = useRef(Date.now());
  const lastTimestampRef = useRef<string | null>(null);
  const retryCountRef = useRef(0);
  const lastUrlRef = useRef(url);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ["mousedown", "keydown", "touchstart"];
    events.forEach((e) => document.addEventListener(e, updateActivity));

    return () => {
      events.forEach((e) => document.removeEventListener(e, updateActivity));
    };
  }, []);

  const fetchData = useCallback(async () => {
    if (!enabled || !isTabActiveRef.current) return;
    if (isFetchingRef.current) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    isFetchingRef.current = true;

    try {
      const headers: HeadersInit = {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      };

      // First check if data changed
      const checkResponse = await fetch(`${url}${url.includes("?") ? "&" : "?"}check=true`, {
        signal: abortControllerRef.current.signal,
        headers,
        credentials: "same-origin",
      });

      if (checkResponse.ok) {
        const { lastModified } = await checkResponse.json();

        // If timestamp hasn't changed, skip full fetch
        if (lastModified === lastTimestampRef.current) {
          retryCountRef.current = 0;
          setError(null);
          return;
        }

        // Timestamp changed, fetch full data
        const fullResponse = await fetch(url, {
          signal: abortControllerRef.current.signal,
          headers,
          credentials: "same-origin",
        });

        if (fullResponse.ok) {
          const data = await fullResponse.json();
          lastTimestampRef.current = lastModified;
          setLastSync(new Date());
          onUpdate?.(data);
        } else {
          throw new Error(`Client error: ${fullResponse.status}`);
        }
      } else {
        throw new Error(`Client error: ${checkResponse.status}`);
      }

      retryCountRef.current = 0;
      setError(null);
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        if (retryCountRef.current < MAX_RETRY_ATTEMPTS) {
          retryCountRef.current++;
          const delay = RETRY_DELAY_BASE * Math.pow(2, retryCountRef.current - 1);
          setTimeout(() => {
            if (enabled && isTabActiveRef.current) {
              fetchData();
            }
          }, delay);
        } else {
          setError(error.message);
          console.error("Polling error after max retries:", error);
        }
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, [url, enabled, onUpdate]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      isTabActiveRef.current = !document.hidden;
      if (isTabActiveRef.current && enabled) {
        fetchData();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchData, enabled]);

  useEffect(() => {
    if (lastUrlRef.current !== url) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      lastTimestampRef.current = null;
      retryCountRef.current = 0;
      setError(null);
      lastUrlRef.current = url;
    }
  }, [url]);

  useEffect(() => {
    if (!enabled) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      return;
    }

    const scheduleNext = (delay: number) => {
      timeoutRef.current = setTimeout(() => {
        if (isTabActiveRef.current && enabled) {
          fetchData();
        }

        if (enabled) {
          const timeSinceActivity = Date.now() - lastActivityRef.current;
          const nextInterval = getAdaptiveInterval(timeSinceActivity, interval);
          scheduleNext(nextInterval);
        }
      }, delay);
    };

    fetchData();
    const timeSinceActivity = Date.now() - lastActivityRef.current;
    const initialInterval = getAdaptiveInterval(timeSinceActivity, interval);
    scheduleNext(initialInterval);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [enabled, interval, fetchData]);

  return { lastSync, error };
}
