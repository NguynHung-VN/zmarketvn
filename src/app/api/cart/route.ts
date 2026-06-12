import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { rateLimiters } from '@/lib/rate-limit'
import { z } from 'zod/v4'

export async function GET() {
  try {
    const user = await requireAuth()

    const cartItems = await db.cartItem.findMany({
      where: { userId: user.id },
      include: {
        product: {
          include: {
            shop: {
              select: { id: true, name: true },
            },
            category: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const total = cartItems.reduce((sum, item) => {
      return sum + item.product.price * item.quantity
    }, 0)

    return NextResponse.json({ cartItems, total })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}

const addToCartSchema = z.object({
  productId: z.string().min(1, 'Vui lòng chọn sản phẩm'),
  quantity: z.number().int().min(1, 'Số lượng phải lớn hơn 0').max(100, 'Số lượng quá lớn').default(1),
})

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const rateLimitResponse = rateLimiters.cart(request)
    if (rateLimitResponse) return rateLimitResponse

    const user = await requireAuth()
    const body = await request.json()
    const { productId, quantity } = addToCartSchema.parse(body)

    // Check product exists and is in stock
    const product = await db.product.findUnique({ where: { id: productId } })
    if (!product) {
      return NextResponse.json(
        { error: 'Không tìm thấy sản phẩm' },
        { status: 404 }
      )
    }
    if (!product.inStock) {
      return NextResponse.json(
        { error: 'Sản phẩm đã hết hàng' },
        { status: 400 }
      )
    }

    // Check if already in cart
    const existingItem = await db.cartItem.findFirst({
      where: { userId: user.id, productId },
    })

    if (existingItem) {
      // Update quantity
      const updated = await db.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
        include: {
          product: {
            include: {
              shop: { select: { id: true, name: true } },
            },
          },
        },
      })
      return NextResponse.json({ cartItem: updated, message: 'Đã cập nhật giỏ hàng' })
    }

    // Create new cart item
    const cartItem = await db.cartItem.create({
      data: {
        userId: user.id,
        productId,
        quantity,
      },
      include: {
        product: {
          include: {
            shop: { select: { id: true, name: true } },
          },
        },
      },
    })

    return NextResponse.json(
      { cartItem, message: 'Đã thêm vào giỏ hàng' },
      { status: 201 }
    )
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
