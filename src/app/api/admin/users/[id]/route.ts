import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { rateLimiters } from '@/lib/rate-limit'
import { z } from 'zod/v4'
import { updateUserSchema } from '@/modules/admin/schema'
import { updateUser, ServiceError } from '@/modules/admin/service'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting check
    const rateLimitResponse = rateLimiters.adminUserUpdate(request)
    if (rateLimitResponse) return rateLimitResponse

    const adminUser = await requireRole('ADMIN')
    const { id } = await params
    const body = await request.json()
    const data = updateUserSchema.parse(body)

    const updated = await updateUser(adminUser.id, id, data as any)

    return NextResponse.json({ user: updated, message: 'Đã cập nhật người dùng' })
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json(
        { error: error.message === 'Unauthorized' ? 'Chưa đăng nhập' : 'Không có quyền truy cập' },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      )
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
