import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, setAuthCookie } from '@/lib/auth'
import { rateLimiters } from '@/lib/rate-limit'
import { z } from 'zod/v4'

// In-memory tracker for failed login attempts
// Key: email (lowercase), Value: { count, lockedUntil }
const failedAttempts = new Map<string, { count: number; lockedUntil: number | null }>()
const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes

// Periodic cleanup of stale entries (every 10 minutes)
let lastCleanup = Date.now()
function cleanupStaleEntries() {
  const now = Date.now()
  if (now - lastCleanup < 10 * 60 * 1000) return
  lastCleanup = now
  for (const [key, value] of failedAttempts) {
    if (value.lockedUntil && value.lockedUntil < now) {
      failedAttempts.delete(key)
    } else if (!value.lockedUntil && value.count === 0) {
      failedAttempts.delete(key)
    }
  }
}

const loginSchema = z.object({
  email: z.string().min(1, 'Vui lòng nhập email'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
})

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const rateLimitResponse = rateLimiters.login(request)
    if (rateLimitResponse) return rateLimitResponse

    const body = await request.json()
    const { email, password } = loginSchema.parse(body)

    // Check account lockout from in-memory tracker
    cleanupStaleEntries()
    const emailKey = email.toLowerCase()
    const attemptInfo = failedAttempts.get(emailKey)

    if (attemptInfo) {
      // Check if account is currently locked
      if (attemptInfo.lockedUntil && attemptInfo.lockedUntil > Date.now()) {
        const remainingMinutes = Math.ceil((attemptInfo.lockedUntil - Date.now()) / 60000)
        return NextResponse.json(
          { error: `Tài khoản tạm khóa do nhiều lần đăng nhập sai. Thử lại sau ${remainingMinutes} phút.` },
          { status: 429 }
        )
      }
      // Lockout expired, reset
      if (attemptInfo.lockedUntil && attemptInfo.lockedUntil <= Date.now()) {
        failedAttempts.delete(emailKey)
      }
    }

    const user = await db.user.findUnique({ where: { email } })

    if (!user || !(await verifyPassword(password, user.password))) {
      // Track failed attempt
      const current = failedAttempts.get(emailKey) || { count: 0, lockedUntil: null }
      current.count += 1

      if (current.count >= MAX_FAILED_ATTEMPTS) {
        current.lockedUntil = Date.now() + LOCKOUT_DURATION_MS
        failedAttempts.set(emailKey, current)

        // Also deactivate the account in the database
        if (user) {
          await db.user.update({
            where: { id: user.id },
            data: { isActive: false },
          })
        }

        return NextResponse.json(
          { error: 'Tài khoản đã bị khóa do nhiều lần đăng nhập sai. Vui lòng liên hệ quản trị viên.' },
          { status: 429 }
        )
      }

      failedAttempts.set(emailKey, current)

      const remainingAttempts = MAX_FAILED_ATTEMPTS - current.count
      return NextResponse.json(
        { error: `Email hoặc mật khẩu không đúng. Còn ${remainingAttempts} lần thử.` },
        { status: 401 }
      )
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Tài khoản đã bị khóa' },
        { status: 403 }
      )
    }

    // Successful login - reset failed attempts tracker
    failedAttempts.delete(emailKey)

    const { password: _, ...userWithoutPassword } = user
    const headers = setAuthCookie(user.id)

    return NextResponse.json(
      { user: userWithoutPassword, message: 'Đăng nhập thành công' },
      { headers }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Lỗi server' },
      { status: 500 }
    )
  }
}
