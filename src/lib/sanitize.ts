/**
 * Input sanitization utilities to prevent XSS attacks.
 * Strips HTML tags and encodes special characters from user input.
 */

/**
 * Sanitize text input by stripping HTML tags and encoding special characters.
 * This should be used for user-generated content that will be displayed in the UI.
 */
export function sanitizeText(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

/**
 * Strip HTML tags from input string.
 * More aggressive than sanitizeText - completely removes tags instead of encoding them.
 */
export function stripHtml(input: string): string {
  let cleaned = input
  // Remove script content FIRST (before stripping tags, so content inside is removed too)
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  // Remove HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, '')
  // Remove event handlers (handles quoted, unquoted, and backtick values)
  cleaned = cleaned.replace(/\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|`[^`]*`|[^\s>]*)/gi, '')
  return cleaned.trim()
}

/**
 * Sanitize a string for safe storage in the database.
 * Removes null bytes, control characters, and HTML tags to prevent stored XSS.
 */
export function sanitizeForStorage(input: string): string {
  return stripHtml(input)
    .replace(/\0/g, '') // Remove null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .trim()
}
