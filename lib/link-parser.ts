/**
 * Utility for safely parsing and rendering links in text content
 * Prevents XSS attacks while providing clickable links
 */

// URL regex patterns
const URL_WITH_PROTOCOL = /https?:\/\/[^\s<>"']+/gi;
const URL_WITH_WWW = /www\.[^\s<>"']+/gi;
const SIMPLE_DOMAIN = /(?:^|\s)([a-z0-9\-]+(?:\.[a-z0-9\-]+)+(?:\/[^\s<>"']*)?)/gi;

export interface LinkPart {
  type: 'text' | 'link';
  content: string;
  url?: string;
}

/**
 * Sanitizes a URL to prevent XSS attacks
 * Only allows http, https, and ftp protocols
 */
function sanitizeUrl(url: string): string | null {
  try {
    // Add protocol if missing
    let processedUrl = url;
    if (!url.match(/^[a-zA-Z]+:\/\//)) {
      processedUrl = 'https://' + url;
    }

    const urlObj = new URL(processedUrl);
    
    // Only allow safe protocols
    const allowedProtocols = ['http:', 'https:', 'ftp:'];
    if (!allowedProtocols.includes(urlObj.protocol)) {
      return null;
    }

    // Additional validation to prevent javascript: and data: URLs
    if (urlObj.href.toLowerCase().includes('javascript:') || 
        urlObj.href.toLowerCase().includes('data:')) {
      return null;
    }

    return urlObj.href;
  } catch {
    return null;
  }
}

/**
 * Escapes HTML entities to prevent XSS
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Parses text and identifies links
 */
export function parseLinks(text: string): LinkPart[] {
  if (!text) return [];

  const matches: Array<{ start: number; end: number; url: string; type: 'protocol' | 'www' | 'domain' }> = [];
  
  // Find all matches in a single pass
  let match;
  
  // URLs with protocol
  URL_WITH_PROTOCOL.lastIndex = 0;
  while ((match = URL_WITH_PROTOCOL.exec(text)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      url: match[0],
      type: 'protocol'
    });
  }
  
  // URLs with www
  URL_WITH_WWW.lastIndex = 0;
  while ((match = URL_WITH_WWW.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    
    // Skip if overlaps with protocol URL
    if (!matches.some(m => start >= m.start && start < m.end)) {
      matches.push({ start, end, url: match[0], type: 'www' });
    }
  }
  
  // Simple domains
  SIMPLE_DOMAIN.lastIndex = 0;
  while ((match = SIMPLE_DOMAIN.exec(text)) !== null) {
    const url = match[1];
    const start = match.index + match[0].indexOf(url);
    const end = start + url.length;
    
    // Skip if overlaps with existing matches
    if (!matches.some(m => 
      (start >= m.start && end <= m.end) ||
      (start < m.start && end > m.start)
    )) {
      matches.push({ start, end, url, type: 'domain' });
    }
  }
  
  // Early return if no matches
  if (matches.length === 0) {
    return [{ type: 'text', content: escapeHtml(text) }];
  }
  
  // Sort by position
  matches.sort((a, b) => a.start - b.start);
  
  // Build parts array
  const parts: LinkPart[] = [];
  let lastIndex = 0;
  
  for (const match of matches) {
    // Add text before link
    if (match.start > lastIndex) {
      const textContent = text.substring(lastIndex, match.start);
      if (textContent) {
        parts.push({ type: 'text', content: escapeHtml(textContent) });
      }
    }
    
    // Process and add link
    const sanitizedUrl = sanitizeUrl(match.url);
    if (sanitizedUrl) {
      parts.push({
        type: 'link',
        content: escapeHtml(match.url),
        url: sanitizedUrl
      });
    } else {
      parts.push({ type: 'text', content: escapeHtml(match.url) });
    }
    
    lastIndex = match.end;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: escapeHtml(text.substring(lastIndex)) });
  }
  
  return parts;
}
