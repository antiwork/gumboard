const eventCache = new Set<string>();

export function isDuplicateEvent(eventId: string): boolean {
  if (eventCache.has(eventId)) return true;
  eventCache.add(eventId);

  // Clear cache after 5 mins
  setTimeout(() => eventCache.delete(eventId), 5 * 60 * 1000);

  return false;
}
