import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { z } from 'zod/v4'

const updateDeliverySchema = z.object({
  status: z.enum(['SHIPPING', 'DELIVERED']),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole('SHIPPER', 'ADMIN')
    const { id } = await params
    const body = await request.json()
    const { status } = updateDeliverySchema.parse(body)

    const order = await db.order.findFirst({
      where: { id, shipperId: user.id },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Không tìm thấy đơn giao hàng' },
        { status: 404 }
      )
    }

    // Validate status transition
    if (order.status !== 'PREPARING' && order.status !== 'SHIPPING') {
      return NextResponse.json(
        { error: 'Đơn hàng chưa sẵn sàng để giao' },
        { status: 400 }
      )
    }

    if (status === 'SHIPPING' && order.status !== 'PREPARING') {
      return NextResponse.json(
        { error: 'Đơn hàng phải ở trạng thái đang chuẩn bị mới có thể lấy giao' },
        { status: 400 }
      )
    }

    const updated = await db.order.update({
      where: { id },
      data: { status },
      include: {
        buyer: {
          select: { id: true, name: true, phone: true, address: true },
        },
        shop: {
          select: { id: true, name: true, address: true, phone: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, image: true, unit: true },
            },
          },
        },
      },
    })

    // If delivered, update payment status for COD
    if (status === 'DELIVERED' && order.paymentMethod === 'COD') {
      await db.order.update({
        where: { id },
        data: { paymentStatus: 'PAID' },
      })
    }

    return NextResponse.json({ order: updated, message: 'Đã cập nhật trạng thái giao hàng' })
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
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
