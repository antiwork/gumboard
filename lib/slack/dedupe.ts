// Option 1: Size-limited cache with LRU behavior
const MAX_CACHE_SIZE = 1000;
const eventCache = new Map<string, number>();

export function isDuplicateEvent(eventId: string): boolean {
  const now = Date.now();

  if (eventCache.has(eventId)) return true;

  // Clean expired entries if cache is getting large
  if (eventCache.size > MAX_CACHE_SIZE) {
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    for (const [id, timestamp] of eventCache.entries()) {
      if (timestamp < fiveMinutesAgo) {
        eventCache.delete(id);
      }
    }
  }

  eventCache.set(eventId, now);
  return false;
}

// Option 2: Periodic cleanup instead of per-event timeouts
setInterval(() => {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  for (const [id, timestamp] of eventCache.entries()) {
    if (timestamp < fiveMinutesAgo) {
      eventCache.delete(id);
    }
  }
}, 60 * 1000); // Clean every minute
