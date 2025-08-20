import DOMPurify from 'dompurify';

export function sanitizeChecklistContent(html: string): string {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['a'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    KEEP_CONTENT: true,
  });
  
  return clean.replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ');
}
