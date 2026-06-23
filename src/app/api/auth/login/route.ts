import { NextRequest, NextResponse } from 'next/server'
import { setAuthCookie } from '@/lib/auth'
import { rateLimiters } from '@/lib/rate-limit'
import { loginSchema } from '@/modules/auth/schema'
import { loginUser, ServiceError } from '@/modules/auth/service'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const rateLimitResponse = rateLimiters.login(request)
    if (rateLimitResponse) return rateLimitResponse

    const body = await request.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      const firstIssue = parsed.error.issues?.[0]?.message || 'Dữ liệu không hợp lệ'
      return NextResponse.json(
        { error: firstIssue },
        { status: 400 }
      )
    }

    const { email, password } = parsed.data
    const user = await loginUser({ email, password })

    const { password: _, ...userWithoutPassword } = user
    const headers = await setAuthCookie(user.id)

    return NextResponse.json(
      { user: userWithoutPassword, message: 'Đăng nhập thành công' },
      { headers }
    )
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }
    console.error('[Login API Error]:', error)
    const message = error instanceof Error ? error.message : 'Lỗi server'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
