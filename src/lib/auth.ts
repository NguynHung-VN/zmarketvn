import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { createHmac, timingSafeEqual } from 'crypto'

// Cookie signing secret - MUST be set via environment variable
const COOKIE_SECRET = process.env.COOKIE_SECRET
if (!COOKIE_SECRET) {
  throw new Error('COOKIE_SECRET environment variable is required. Set it in .env.local')
}

// Password hashing using bcrypt (secure)
const SALT_ROUNDS = 10

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

// Verify password against bcrypt hash
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// Sign a cookie value with HMAC
function signCookieValue(value: string): string {
  const signature = createHmac('sha256', COOKIE_SECRET).update(value).digest('hex')
  return `${value}.${signature}`
}

// Verify a signed cookie value using timing-safe comparison
function verifyCookieValue(signedValue: string): string | null {
  const dotIndex = signedValue.lastIndexOf('.')
  if (dotIndex === -1) return null

  const value = signedValue.substring(0, dotIndex)
  const signature = signedValue.substring(dotIndex + 1)

  const expectedSignature = createHmac('sha256', COOKIE_SECRET).update(value).digest('hex')

  // Timing-safe comparison to prevent timing attacks
  try {
    const sigBuf = Buffer.from(signature, 'hex')
    const expectedBuf = Buffer.from(expectedSignature, 'hex')
    if (sigBuf.length !== expectedBuf.length) return null
    if (!timingSafeEqual(sigBuf, expectedBuf)) return null
  } catch {
    return null
  }

  return value
}

// Get current user from cookie
export async function getCurrentUser() {
  const cookieStore = await cookies()
  const rawValue = cookieStore.get('userId')?.value

  if (!rawValue) return null

  // Verify cookie signature
  const userId = verifyCookieValue(rawValue)
  if (!userId) return null

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      avatar: true,
      role: true,
      address: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!user || !user.isActive) return null

  return user
}

// Require authentication - throws if not logged in
export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

// Require specific role
export async function requireRole(...roles: string[]) {
  const user = await requireAuth()
  if (!roles.includes(user.role)) {
    throw new Error('Forbidden')
  }
  return user
}

// Set auth cookie (signed)
export function setAuthCookie(userId: string): Record<string, string> {
  const signedValue = signCookieValue(userId)
  const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return {
    'Set-Cookie': `userId=${signedValue}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${60 * 60 * 24 * 7}${secureFlag}`,
  }
}

// Clear auth cookie
export function clearAuthCookie(): Record<string, string> {
  const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return {
    'Set-Cookie': `userId=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secureFlag}`,
  }
}
