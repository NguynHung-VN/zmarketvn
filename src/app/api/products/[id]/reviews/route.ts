import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { sanitizeForStorage } from '@/lib/sanitize'
import { z } from 'zod/v4'

const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5, 'Đánh giá phải từ 1 đến 5 sao'),
  comment: z.string().max(2000, 'Nhận xét quá dài').optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    if (user.role !== 'BUYER') {
      return NextResponse.json({ error: 'Chỉ người mua mới có thể đánh giá' }, { status: 403 })
    }

    const { id: productId } = await params
    const body = await request.json()
    const data = createReviewSchema.parse(body)

    // Check product exists
    const product = await db.product.findUnique({ where: { id: productId } })
    if (!product) {
      return NextResponse.json({ error: 'Không tìm thấy sản phẩm' }, { status: 404 })
    }

    // Check if user already reviewed this product
    const existing = await db.review.findFirst({
      where: { userId: user.id, productId },
    })
    if (existing) {
      return NextResponse.json({ error: 'Bạn đã đánh giá sản phẩm này rồi' }, { status: 400 })
    }

    // Verify user has a delivered order with this product
    const orderItem = await db.orderItem.findFirst({
      where: {
        productId,
        order: {
          buyerId: user.id,
          status: 'DELIVERED',
        },
      },
    })
    if (!orderItem) {
      return NextResponse.json({ error: 'Bạn chỉ có thể đánh giá sản phẩm đã mua và nhận hàng' }, { status: 400 })
    }

    // Sanitize comment
    const sanitizedComment = data.comment ? sanitizeForStorage(data.comment) : null

    const review = await db.review.create({
      data: {
        rating: Math.round(data.rating),
        comment: sanitizedComment,
        userId: user.id,
        productId,
      },
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
      },
    })

    // Update product rating
    const reviews = await db.review.findMany({
      where: { productId },
      select: { rating: true },
    })
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    await db.product.update({
      where: { id: productId },
      data: { rating: Math.round(avgRating * 10) / 10 },
    })

    return NextResponse.json({ review }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
