import DOMPurify from 'isomorphic-dompurify';

export function sanitizeChecklistContent(html: string): string {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["a"],
    ALLOWED_ATTR: ["href", "target", "rel"],
    KEEP_CONTENT: true,
  });
  
  return clean.replace(/<a\s+(?![^>]*target=)[^>]*>/g, (match) => {
    if (match.includes('target=')) return match;
    return match.replace('<a ', '<a target="_blank" rel="noopener noreferrer" ');
  });
}
