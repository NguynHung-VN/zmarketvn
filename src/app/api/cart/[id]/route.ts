import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { z } from 'zod/v4'

const updateCartSchema = z.object({
  quantity: z.number().int().min(1, 'Số lượng phải lớn hơn 0').max(100, 'Số lượng quá lớn'),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await request.json()
    const { quantity } = updateCartSchema.parse(body)

    const cartItem = await db.cartItem.findFirst({
      where: { id, userId: user.id },
    })

    if (!cartItem) {
      return NextResponse.json(
        { error: 'Không tìm thấy sản phẩm trong giỏ hàng' },
        { status: 404 }
      )
    }

    const updated = await db.cartItem.update({
      where: { id },
      data: { quantity },
      include: {
        product: {
          include: {
            shop: { select: { id: true, name: true } },
          },
        },
      },
    })

    return NextResponse.json({ cartItem: updated, message: 'Đã cập nhật' })
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const cartItem = await db.cartItem.findFirst({
      where: { id, userId: user.id },
    })

    if (!cartItem) {
      return NextResponse.json(
        { error: 'Không tìm thấy sản phẩm trong giỏ hàng' },
        { status: 404 }
      )
    }

    await db.cartItem.delete({ where: { id } })

    return NextResponse.json({ message: 'Đã xóa khỏi giỏ hàng' })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
