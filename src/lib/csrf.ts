import { NextRequest } from 'next/server'
import { randomBytes } from 'crypto'

/**
 * CSRF Protection Utilities
 *
 * Implements Origin-based validation + double-submit cookie pattern:
 * 1. API routes that set cookies should call setCSRFCookieOnResponse
 * 2. On state-changing requests (POST, PUT, DELETE, PATCH), the token
 *    from the X-CSRF-Token header is validated against the cookie value
 * 3. Also validates Origin/Referer headers as an additional layer
 */

const CSRF_COOKIE_NAME = '__csrf_token'
const CSRF_HEADER_NAME = 'x-csrf-token'
const CSRF_TOKEN_LENGTH = 32

/**
 * Generate a cryptographically random CSRF token.
 */
export function generateCSRFToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString('hex')
}

/**
 * Check if the request method requires CSRF validation.
 */
function isStateChangingMethod(method: string): boolean {
  return ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase())
}

/**
 * Validate CSRF - checks Origin/Referer first, then token if present.
 * Returns true if the request is safe (passes validation).
 * For state-changing requests without CSRF cookie, we rely on
 * SameSite=Strict cookies + Origin validation.
 */
export function validateCSRF(request: NextRequest): boolean {
  const method = request.method.toUpperCase()

  // Skip validation for safe methods
  if (!isStateChangingMethod(method)) {
    return true
  }

  // Check Origin/Referer first
  const originValid = validateCSRFOrigin(request)
  if (!originValid) {
    return false
  }

  // If CSRF cookie exists, validate the token too
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value
  if (cookieToken) {
    const headerToken = request.headers.get(CSRF_HEADER_NAME)
    if (!headerToken) {
      return false
    }
    return timingSafeEqual(cookieToken, headerToken)
  }

  // No CSRF cookie = first request or cookie not set yet
  // Allow through (SameSite=Strict + Origin check provides baseline protection)
  return true
}

/**
 * Validate CSRF protection using Origin/Referer headers.
 */
function validateCSRFOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')

  // If neither origin nor referer is present, allow through
  // (SameSite=Strict cookies provide baseline protection)
  if (!origin && !referer) {
    return true
  }

  const allowedHosts = getAllowedHosts()

  // Check origin header first (preferred)
  if (origin) {
    try {
      const originUrl = new URL(origin)
      return allowedHosts.includes(originUrl.hostname)
    } catch {
      return false
    }
  }

  // Fall back to referer header
  if (referer) {
    try {
      const refererUrl = new URL(referer)
      return allowedHosts.includes(refererUrl.hostname)
    } catch {
      return false
    }
  }

  return false
}

/**
 * Get allowed hostnames for CSRF origin validation.
 */
function getAllowedHosts(): string[] {
  const hosts = ['localhost', '127.0.0.1']

  // Add production host from env if available
  if (process.env.NEXT_PUBLIC_APP_HOST) {
    try {
      const url = new URL(process.env.NEXT_PUBLIC_APP_HOST)
      hosts.push(url.hostname)
    } catch {
      hosts.push(process.env.NEXT_PUBLIC_APP_HOST)
    }
  }

  return hosts
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}
