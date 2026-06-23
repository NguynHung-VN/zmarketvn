import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { z } from 'zod/v4'
import { updateDeliverySchema } from '@/modules/delivery/schema'
import { updateDeliveryStatus, ServiceError } from '@/modules/delivery/service'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole('SHIPPER', 'ADMIN')
    const { id } = await params
    const body = await request.json()
    const { status } = updateDeliverySchema.parse(body)

    const order = await updateDeliveryStatus(user.id, id, status)

    return NextResponse.json({ order, message: 'Đã cập nhật trạng thái giao hàng' })
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
