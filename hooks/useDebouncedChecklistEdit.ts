"use client";

import { useCallback, useRef } from "react";

export type EditFn = (noteId: string, itemId: string, content: string) => void;

export function useDebouncedChecklistEdit(
  onFlush: (noteId: string, itemId: string, content: string) => void,
  delayMs = 1000
) {
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const debouncedEdit = useCallback<EditFn>((noteId, itemId, content) => {
    const key = `${noteId}-${itemId}`;
    const existing = timeoutsRef.current.get(key);
    if (existing) clearTimeout(existing);

    const timeout = setTimeout(() => {
      onFlush(noteId, itemId, content);
      timeoutsRef.current.delete(key);
    }, delayMs);

    timeoutsRef.current.set(key, timeout);
  }, [onFlush, delayMs]);

  const cancelPendingEdit = useCallback((noteId: string, itemId: string) => {
    const key = `${noteId}-${itemId}`;
    const existing = timeoutsRef.current.get(key);
    if (existing) {
      clearTimeout(existing);
      timeoutsRef.current.delete(key);
    }
  }, []);

  const clearAll = useCallback(() => {
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current.clear();
  }, []);

  return { debouncedEdit, cancelPendingEdit, clearAll } as const;
}

export default useDebouncedChecklistEdit;


