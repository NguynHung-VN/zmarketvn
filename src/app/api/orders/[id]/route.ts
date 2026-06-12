import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { rateLimiters } from '@/lib/rate-limit'
import { z } from 'zod/v4'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const order = await db.order.findUnique({
      where: { id },
      include: {
        buyer: {
          select: { id: true, name: true, phone: true, avatar: true, address: true },
        },
        shop: {
          select: { id: true, name: true, image: true, address: true, phone: true },
        },
        shipper: {
          select: { id: true, name: true, phone: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, image: true, unit: true, price: true },
            },
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Không tìm thấy đơn hàng' },
        { status: 404 }
      )
    }

    // Check access
    const isBuyer = order.buyerId === user.id
    const isShopOwner = order.shopId && (await db.shop.findUnique({ where: { id: order.shopId, ownerId: user.id } }))
    const isShipper = order.shipperId === user.id
    const isAdmin = user.role === 'ADMIN'

    if (!isBuyer && !isShopOwner && !isShipper && !isAdmin) {
      return NextResponse.json(
        { error: 'Không có quyền xem đơn hàng này' },
        { status: 403 }
      )
    }

    return NextResponse.json({ order })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}

const updateOrderSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPING', 'DELIVERED', 'CANCELLED']).optional(),
  shipperId: z.string().max(100, 'ID quá dài').optional(),
  paymentStatus: z.enum(['UNPAID', 'PAID', 'REFUNDED']).optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting check
    const rateLimitResponse = rateLimiters.orderUpdate(request)
    if (rateLimitResponse) return rateLimitResponse

    const user = await requireAuth()
    const { id } = await params
    const body = await request.json()
    const data = updateOrderSchema.parse(body)

    const order = await db.order.findUnique({ where: { id } })

    if (!order) {
      return NextResponse.json(
        { error: 'Không tìm thấy đơn hàng' },
        { status: 404 }
      )
    }

    // Determine user's relationship to this order
    const isBuyer = order.buyerId === user.id
    const isShopOwner = !!(await db.shop.findUnique({ where: { id: order.shopId, ownerId: user.id } }))
    const isAssignedShipper = order.shipperId === user.id
    const isAdmin = user.role === 'ADMIN'

    // Permission check for status updates
    if (data.status) {
      // Buyer can cancel pending orders
      if (data.status === 'CANCELLED' && isBuyer && order.status === 'PENDING') {
        // allowed
      }
      // Shop owner can confirm, prepare
      else if (['CONFIRMED', 'PREPARING'].includes(data.status) && (isShopOwner || isAdmin)) {
        // allowed
      }
      // Assigned shipper can mark as shipping or delivered
      else if (['SHIPPING', 'DELIVERED'].includes(data.status) && (isAssignedShipper || isAdmin)) {
        // allowed
      }
      // Admin can do anything
      else if (isAdmin) {
        // allowed
      }
      else {
        return NextResponse.json(
          { error: 'Không có quyền cập nhật trạng thái này' },
          { status: 403 }
        )
      }
    }

    // Authorization check for paymentStatus updates
    // Only admin or the assigned shipper can update payment status
    if (data.paymentStatus) {
      if (!isAdmin && !isAssignedShipper) {
        return NextResponse.json(
          { error: 'Không có quyền cập nhật trạng thái thanh toán' },
          { status: 403 }
        )
      }
    }

    // Authorization check for shipperId assignment
    // Only admin or shop owner can assign a shipper
    // The assigned user must have SHIPPER role
    if (data.shipperId) {
      if (!isAdmin && !isShopOwner) {
        return NextResponse.json(
          { error: 'Không có quyền chỉ định shipper' },
          { status: 403 }
        )
      }
      // Validate that the assigned user has SHIPPER role
      const shipperUser = await db.user.findUnique({ where: { id: data.shipperId } })
      if (!shipperUser || shipperUser.role !== 'SHIPPER') {
        return NextResponse.json(
          { error: 'Người được chỉ định không phải là shipper' },
          { status: 400 }
        )
      }
      if (!shipperUser.isActive) {
        return NextResponse.json(
          { error: 'Shipper không còn hoạt động' },
          { status: 400 }
        )
      }
    }

    const updated = await db.order.update({
      where: { id },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.shipperId && { shipperId: data.shipperId }),
        ...(data.paymentStatus && { paymentStatus: data.paymentStatus }),
      },
      include: {
        buyer: {
          select: { id: true, name: true, phone: true },
        },
        shop: {
          select: { id: true, name: true },
        },
        shipper: {
          select: { id: true, name: true, phone: true },
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
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
