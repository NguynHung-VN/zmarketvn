// src/app/api/orders/[id]/route.ts
import { NextResponse } from 'next/server'
import { requireAuth, requireRole, errorResponse } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cancelOrder, updateOrderStatus, ServiceError } from '@/modules/order/service'
import { cancelOrderSchema, updateStatusSchema } from '@/modules/order/schema'

// GET — chi tiết đơn
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth()
    const { id } = await params
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, shop: true, payment: true, delivery: true },
    })
    if (!order) throw new ServiceError(404, 'Không tìm thấy đơn')
    // Buyer chỉ xem đơn của mình; seller chỉ xem đơn sạp mình; admin xem tất cả
    if (session.role === 'BUYER' && order.userId !== session.id) {
      throw new ServiceError(403, 'Không có quyền')
    }
    return NextResponse.json({ order })
  } catch (error) {
    if (error instanceof ServiceError) return NextResponse.json({ error: error.message }, { status: error.statusCode })
    return errorResponse(error)
  }
}

// PATCH — đổi trạng thái (seller/shipper/admin)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireRole('SELLER', 'SHIPPER', 'ADMIN')
    const { id } = await params
    const body = await request.json()
    const parsed = updateStatusSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Trạng thái không hợp lệ' }, { status: 400 })
    }
    const order = await updateOrderStatus(id, parsed.data.status, session.id)
    return NextResponse.json({ order })
  } catch (error) {
    if (error instanceof ServiceError) return NextResponse.json({ error: error.message }, { status: error.statusCode })
    return errorResponse(error)
  }
}

// DELETE — huỷ đơn (buyer)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth()
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const parsed = cancelOrderSchema.safeParse(body)
    const order = await cancelOrder(id, session.id, parsed.success ? parsed.data.reason : undefined)
    return NextResponse.json({ order })
  } catch (error) {
    if (error instanceof ServiceError) return NextResponse.json({ error: error.message }, { status: error.statusCode })
    return errorResponse(error)
  }
}
