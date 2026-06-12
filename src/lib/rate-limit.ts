import { NextRequest, NextResponse } from 'next/server'

// In-memory rate limit store
// Key: identifier (e.g., IP + endpoint), Value: array of timestamps
const rateLimitStore = new Map<string, number[]>()

// Clean up old entries periodically (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanupOldEntries() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now

  for (const [key, timestamps] of rateLimitStore.entries()) {
    const recent = timestamps.filter((t) => now - t < 60 * 1000)
    if (recent.length === 0) {
      rateLimitStore.delete(key)
    } else {
      rateLimitStore.set(key, recent)
    }
  }
}

export interface RateLimitOptions {
  /** Maximum number of requests allowed in the window */
  maxRequests: number
  /** Time window in milliseconds (default: 60000 = 1 minute) */
  windowMs?: number
  /** Custom key prefix for the rate limit store */
  keyPrefix?: string
}

/**
 * Check rate limit for a request.
 * Returns null if the request is allowed, or a NextResponse with 429 if rate limited.
 */
export function checkRateLimit(
  request: NextRequest,
  options: RateLimitOptions
): NextResponse | null {
  cleanupOldEntries()

  const { maxRequests, windowMs = 60000, keyPrefix = 'default' } = options

  // Get client identifier (IP address from headers or fallback)
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'

  const key = `${keyPrefix}:${ip}`
  const now = Date.now()

  // Get existing timestamps
  const timestamps = rateLimitStore.get(key) || []

  // Filter to only timestamps within the window
  const recentTimestamps = timestamps.filter((t) => now - t < windowMs)

  // Check if rate limit exceeded
  if (recentTimestamps.length >= maxRequests) {
    const oldestInWindow = recentTimestamps[0]
    const retryAfterMs = oldestInWindow + windowMs - now
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000)

    return NextResponse.json(
      {
        error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
        retryAfter: retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSeconds),
          'X-RateLimit-Limit': String(maxRequests),
          'X-RateLimit-Remaining': '0',
        },
      }
    )
  }

  // Add current timestamp and update store
  recentTimestamps.push(now)
  rateLimitStore.set(key, recentTimestamps)

  return null // Request is allowed
}

/**
 * Pre-configured rate limiters for common endpoints
 */
export const rateLimiters = {
  /** Login: 5 requests per minute */
  login: (request: NextRequest) =>
    checkRateLimit(request, { maxRequests: 5, windowMs: 60000, keyPrefix: 'login' }),

  /** Register: 3 requests per minute */
  register: (request: NextRequest) =>
    checkRateLimit(request, { maxRequests: 3, windowMs: 60000, keyPrefix: 'register' }),

  /** Feedback submission: 3 requests per minute */
  feedback: (request: NextRequest) =>
    checkRateLimit(request, { maxRequests: 3, windowMs: 60000, keyPrefix: 'feedback' }),

  /** Chat message: 20 requests per minute */
  chatMessage: (request: NextRequest) =>
    checkRateLimit(request, { maxRequests: 20, windowMs: 60000, keyPrefix: 'chat-msg' }),

  /** File upload: 10 requests per minute */
  upload: (request: NextRequest) =>
    checkRateLimit(request, { maxRequests: 10, windowMs: 60000, keyPrefix: 'upload' }),

  /** Order creation: 10 requests per minute */
  createOrder: (request: NextRequest) =>
    checkRateLimit(request, { maxRequests: 10, windowMs: 60000, keyPrefix: 'order-create' }),

  /** Cart operations: 30 requests per minute */
  cart: (request: NextRequest) =>
    checkRateLimit(request, { maxRequests: 30, windowMs: 60000, keyPrefix: 'cart' }),

  /** Conversation creation: 15 requests per minute */
  createConversation: (request: NextRequest) =>
    checkRateLimit(request, { maxRequests: 15, windowMs: 60000, keyPrefix: 'conv-create' }),

  /** Admin user update: 20 requests per minute */
  adminUserUpdate: (request: NextRequest) =>
    checkRateLimit(request, { maxRequests: 20, windowMs: 60000, keyPrefix: 'admin-user-update' }),

  /** Order update: 20 requests per minute */
  orderUpdate: (request: NextRequest) =>
    checkRateLimit(request, { maxRequests: 20, windowMs: 60000, keyPrefix: 'order-update' }),
}
