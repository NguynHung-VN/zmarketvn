import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { generateCSRFToken } from '@/lib/csrf'
import { db } from '@/lib/db'

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

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Chưa đăng nhập' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, phone, address, avatar } = body

    if (name !== undefined && !name.trim()) {
      return NextResponse.json(
        { error: 'Họ và tên không được để trống' },
        { status: 400 }
      )
    }

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        phone: phone !== undefined ? phone.trim() : undefined,
        address: address !== undefined ? address.trim() : undefined,
        avatar: avatar !== undefined ? avatar : undefined,
      },
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
      }
    })

    return NextResponse.json({
      user: updatedUser,
      message: 'Cập nhật hồ sơ thành công'
    })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json(
      { error: 'Lỗi server khi cập nhật hồ sơ' },
      { status: 500 }
    )
  }
}
