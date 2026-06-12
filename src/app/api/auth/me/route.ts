import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { generateCSRFToken } from '@/lib/csrf'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    // Set CSRF cookie if not already present
    const response = user
      ? NextResponse.json({ user })
      : NextResponse.json(
          { error: 'Chưa đăng nhập', user: null },
          { status: 401 }
        )

    if (!request.cookies.get('__csrf_token')?.value) {
      const token = generateCSRFToken()
      response.cookies.set('__csrf_token', token, {
        httpOnly: false, // Must be readable by client JS
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours
      })
    }

    return response
  } catch {
    return NextResponse.json(
      { error: 'Lỗi server', user: null },
      { status: 500 }
    )
  }
}
