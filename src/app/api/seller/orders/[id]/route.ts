import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { z } from 'zod/v4'

const updateSellerOrderSchema = z.object({
  status: z.enum(['CONFIRMED', 'PREPARING', 'CANCELLED']),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole('SELLER', 'ADMIN')
    const { id } = await params
    const body = await request.json()
    const { status } = updateSellerOrderSchema.parse(body)

    const shop = await db.shop.findUnique({ where: { ownerId: user.id } })
    if (!shop) {
      return NextResponse.json(
        { error: 'Bạn chưa có cửa hàng' },
        { status: 400 }
      )
    }

    const order = await db.order.findFirst({
      where: { id, shopId: shop.id },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Không tìm thấy đơn hàng' },
        { status: 404 }
      )
    }

    // Validate status transition
    if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Không thể thay đổi đơn hàng đã hoàn thành hoặc đã hủy' },
        { status: 400 }
      )
    }

    const updated = await db.order.update({
      where: { id },
      data: { status },
      include: {
        buyer: {
          select: { id: true, name: true, phone: true },
        },
        shop: {
          select: { id: true, name: true },
        },
        shipper: {
          select: { id: true, name: true },
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

    return NextResponse.json({ order: updated, message: 'Đã cập nhật đơn hàng' })
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
