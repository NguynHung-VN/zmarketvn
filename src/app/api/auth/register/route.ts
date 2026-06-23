import { NextRequest, NextResponse } from 'next/server'
import { setAuthCookie } from '@/lib/auth'
import { rateLimiters } from '@/lib/rate-limit'
import { registerSchema } from '@/modules/auth/schema'
import { registerUser, ServiceError } from '@/modules/auth/service'
import { z } from 'zod/v4'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const rateLimitResponse = rateLimiters.register(request)
    if (rateLimitResponse) return rateLimitResponse

    const body = await request.json()
    const data = registerSchema.parse(body)

    const user = await registerUser(data)

    const { password: _, ...userWithoutPassword } = user
    const headers = await setAuthCookie(user.id)

    return NextResponse.json(
      { user: userWithoutPassword, message: 'Đăng ký thành công' },
      { status: 201, headers }
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
    return NextResponse.json(
      { error: 'Lỗi server' },
      { status: 500 }
    )
  }
}
