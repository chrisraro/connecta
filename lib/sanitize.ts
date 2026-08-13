import sanitizeHtmlLib from 'sanitize-html';

/**
 * Input Sanitization Utility
 * 
 * Prevents XSS attacks by sanitizing user-generated content
 * before storage and after retrieval.
 * 
 * Uses sanitize-html which works in both browser and Node.js environments.
 */

/**
 * Sanitize HTML content (allows safe HTML tags)
 * Use for: profile descriptions, about sections, messages
 */
export function sanitizeHTML(input: string): string {
  return sanitizeHtmlLib(input, {
    allowedTags: [
      'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre'
    ],
    allowedAttributes: {
      'a': ['href', 'title', 'target', 'rel'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {},
    allowedSchemesAppliedToAttributes: ['href', 'src'],
    allowProtocolRelative: false,
  });
}

/**
 * Sanitize plain text (strips all HTML)
 * Use for: names, titles, emails, phone numbers
 */
export function sanitizePlainText(input: string): string {
  // Strip all HTML tags and trim
  return sanitizeHtmlLib(input, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();
}

/**
 * Sanitize URL
 * Use for: website links, social media URLs, external links
 */
export function sanitizeURL(input: string): string {
  const sanitized = sanitizeHtmlLib(input, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();

  // Only allow http/https protocols
  try {
    const url = new URL(sanitized);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return '';
    }
    return url.toString();
  } catch {
    // Invalid URL
    return '';
  }
}

/**
 * Sanitize object with multiple fields
 * Use for: form submissions with multiple fields
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  rules: { [K in keyof T]?: 'html' | 'text' | 'url' }
): T {
  const sanitized = { ...obj };

  for (const key in rules) {
    const rule = rules[key];
    const value = obj[key];

    if (typeof value === 'string') {
      switch (rule) {
        case 'html':
          sanitized[key] = sanitizeHTML(value) as T[Extract<keyof T, string>];
          break;
        case 'text':
          sanitized[key] = sanitizePlainText(value) as T[Extract<keyof T, string>];
          break;
        case 'url':
          sanitized[key] = sanitizeURL(value) as T[Extract<keyof T, string>];
          break;
      }
    }
  }

  return sanitized;
}

/**
 * Sanitize array of objects
 * Use for: batch operations, multiple leads, etc.
 */
export function sanitizeArray<T extends Record<string, unknown>>(
  items: T[],
  rules: { [K in keyof T]?: 'html' | 'text' | 'url' }
): T[] {
  return items.map(item => sanitizeObject(item, rules));
}
