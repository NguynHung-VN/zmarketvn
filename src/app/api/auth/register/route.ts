import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, setAuthCookie } from '@/lib/auth'
import { rateLimiters } from '@/lib/rate-limit'
import { z } from 'zod/v4'

const registerSchema = z.object({
  name: z.string().min(2, 'Tên phải có ít nhất 2 ký tự').max(100, 'Tên quá dài'),
  email: z.string().email('Email không hợp lệ').max(200, 'Email quá dài'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự').max(128, 'Mật khẩu quá dài'),
  phone: z.string().max(20, 'Số điện thoại quá dài').optional(),
  address: z.string().max(500, 'Địa chỉ quá dài').optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const rateLimitResponse = rateLimiters.register(request)
    if (rateLimitResponse) return rateLimitResponse

    const body = await request.json()
    const data = registerSchema.parse(body)

    // Check if email already exists
    const existing = await db.user.findUnique({ where: { email: data.email } })
    if (existing) {
      return NextResponse.json(
        { error: 'Email đã được sử dụng' },
        { status: 409 }
      )
    }

    const hashedPassword = await hashPassword(data.password)

    const user = await db.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        phone: data.phone,
        address: data.address,
        role: 'BUYER',
      },
    })

    const { password: _, ...userWithoutPassword } = user
    const headers = setAuthCookie(user.id)

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
    return NextResponse.json(
      { error: 'Lỗi server' },
      { status: 500 }
    )
  }
}
