import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { jwtVerify, SignJWT } from 'jose'

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me')

// Password hashing using bcrypt (secure)
const SALT_ROUNDS = 10

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

// Verify password against bcrypt hash
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export interface SessionUser {
  id: string
  email: string
  name: string
  role: string
  isActive: boolean
}

// Get current user from cookie
export async function getCurrentUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value

  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, SECRET)
    const userId = payload.id as string

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
  } catch {
    return null
  }
}

export class AuthError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
  }
}

// Require authentication - throws if not logged in
export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new AuthError(401, 'Chưa đăng nhập')
  }
  return user
}

// Require specific role
export async function requireRole(...roles: string[]) {
  const user = await requireAuth()
  if (!roles.includes(user.role)) {
    throw new AuthError(403, 'Không có quyền truy cập')
  }
  return user
}

import { NextResponse } from 'next/server'
export function errorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message, code: error.statusCode }, { status: error.statusCode })
  }
  if (error instanceof Error) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Chưa đăng nhập', code: 401 }, { status: 401 })
    }
    if (error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Không có quyền truy cập', code: 403 }, { status: 403 })
    }
    console.error('[API Error]', error)
    return NextResponse.json({ error: error.message || 'Lỗi server nội bộ', code: 500 }, { status: 500 })
  }
  return NextResponse.json({ error: 'Lỗi không xác định', code: 500 }, { status: 500 })
}

// Set auth cookie (signed JWT)
export async function setAuthCookie(userId: string): Promise<Record<string, string>> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true },
  })
  if (!user) return {}

  const token = await new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(SECRET)

  const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return {
    'Set-Cookie': `token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${60 * 60 * 24 * 7}${secureFlag}`,
  }
}

// Clear auth cookie
export function clearAuthCookie(): Record<string, string> {
  const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return {
    'Set-Cookie': `token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secureFlag}`,
  }
}
