import { useEffect, useRef, useState, useCallback } from 'react';

const ACTIVITY_THRESHOLD = 30000;
const MAX_BACKOFF_INTERVAL = 10000;
const BACKOFF_MULTIPLIER = 2;

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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTabActiveRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastDataRef = useRef<string | null>(null);
  const lastActivityRef = useRef(Date.now());
  const etagRef = useRef<string | null>(null);

  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };
    
    const events = ['mousedown', 'keydown', 'touchstart'];
    events.forEach(e => document.addEventListener(e, updateActivity));
    
    return () => {
      events.forEach(e => document.removeEventListener(e, updateActivity));
    };
  }, []);

  const fetchData = useCallback(async () => {
    if (!enabled || !isTabActiveRef.current) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      const headers: HeadersInit = {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      };
      
      if (etagRef.current) {
        headers['If-None-Match'] = etagRef.current;
      }

      const response = await fetch(url, {
        signal: abortControllerRef.current.signal,
        headers,
      });

      if (response.status === 304) {
        return;
      }

      if (response.ok) {
        const newEtag = response.headers.get('ETag');
        if (newEtag) {
          etagRef.current = newEtag;
        }

        const data = await response.json();
        const dataStr = JSON.stringify(data);
        
        if (dataStr !== lastDataRef.current) {
          lastDataRef.current = dataStr;
          setLastSync(new Date());
          onUpdate?.(data);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Polling error:', error);
      }
    }
  }, [url, enabled, onUpdate]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      isTabActiveRef.current = !document.hidden;
      if (isTabActiveRef.current && enabled) {
        fetchData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchData, enabled]);

  useEffect(() => {
    if (!enabled) return;

    const scheduleNext = (delay: number) => {
      timeoutRef.current = setTimeout(() => {
        if (isTabActiveRef.current) {
          fetchData();
        }
        
        const timeSinceActivity = Date.now() - lastActivityRef.current;
        const nextInterval = getAdaptiveInterval(timeSinceActivity, interval);
        scheduleNext(nextInterval);
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

  return { lastSync };
}