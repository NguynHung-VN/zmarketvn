import { db as prisma } from '@/lib/db'
import { hashPassword, verifyPassword } from '@/lib/auth'

export class ServiceError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
    this.name = 'ServiceError'
  }
}

// In-memory tracker for failed login attempts
const failedAttempts = new Map<string, { count: number; lockedUntil: number | null }>()
const MAX_FAILED_ATTEMPTS = process.env.NODE_ENV === 'production' ? 5 : 99999
const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes

function cleanupStaleEntries() {
  const now = Date.now()
  for (const [key, value] of failedAttempts) {
    if (value.lockedUntil && value.lockedUntil < now) {
      failedAttempts.delete(key)
    } else if (!value.lockedUntil && value.count === 0) {
      failedAttempts.delete(key)
    }
  }
}

export async function loginUser(params: { email: string; password: string }) {
  cleanupStaleEntries()
  const emailKey = params.email.toLowerCase()
  const attemptInfo = failedAttempts.get(emailKey)

  if (attemptInfo) {
    if (attemptInfo.lockedUntil && attemptInfo.lockedUntil > Date.now()) {
      const remainingMinutes = Math.ceil((attemptInfo.lockedUntil - Date.now()) / 60000)
      throw new ServiceError(
        429,
        `Tài khoản tạm khóa do nhiều lần đăng nhập sai. Thử lại sau ${remainingMinutes} phút.`
      )
    }
    if (attemptInfo.lockedUntil && attemptInfo.lockedUntil <= Date.now()) {
      failedAttempts.delete(emailKey)
    }
  }

  const user = await prisma.user.findUnique({ where: { email: params.email } })

  if (!user || !user.password || !(await verifyPassword(params.password, user.password))) {
    const current = failedAttempts.get(emailKey) || { count: 0, lockedUntil: null }
    current.count += 1

    if (current.count >= MAX_FAILED_ATTEMPTS) {
      current.lockedUntil = Date.now() + LOCKOUT_DURATION_MS
      failedAttempts.set(emailKey, current)

      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { isActive: false },
        })
      }
      throw new ServiceError(
        429,
        'Tài khoản đã bị khóa do nhiều lần đăng nhập sai. Vui lòng liên hệ quản trị viên.'
      )
    }

    failedAttempts.set(emailKey, current)
    const remainingAttempts = MAX_FAILED_ATTEMPTS - current.count
    throw new ServiceError(
      401,
      `Email hoặc mật khẩu không đúng. Còn ${remainingAttempts} lần thử.`
    )
  }

  if (!user.isActive) {
    throw new ServiceError(403, 'Tài khoản đã bị khóa')
  }

  failedAttempts.delete(emailKey)
  return user
}

export async function registerUser(params: {
  name: string
  email: string
  password: string
  phone?: string | null
  address?: string | null
}) {
  const existing = await prisma.user.findUnique({ where: { email: params.email } })
  if (existing) {
    throw new ServiceError(409, 'Email đã được sử dụng')
  }

  const hashedPassword = await hashPassword(params.password)

  const user = await prisma.user.create({
    data: {
      name: params.name,
      email: params.email,
      password: hashedPassword,
      phone: params.phone || null,
      address: params.address || null,
      role: 'BUYER',
    },
  })

  return user
}
