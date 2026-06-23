import { NextRequest, NextResponse } from 'next/server'
import { setAuthCookie } from '@/lib/auth'
import { rateLimiters } from '@/lib/rate-limit'
import { loginSchema } from '@/modules/auth/schema'
import { loginUser, ServiceError } from '@/modules/auth/service'
import { z } from 'zod/v4'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const rateLimitResponse = rateLimiters.login(request)
    if (rateLimitResponse) return rateLimitResponse

    const body = await request.json()
    const { email, password } = loginSchema.parse(body)

    const user = await loginUser({ email, password })

    const { password: _, ...userWithoutPassword } = user
    const headers = await setAuthCookie(user.id)

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
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }
    console.error('[Login API Error]:', error)
    return NextResponse.json(
      { error: 'Lỗi server' },
      { status: 500 }
    )
  }
}
