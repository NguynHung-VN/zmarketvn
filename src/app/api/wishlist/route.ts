import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { z } from 'zod/v4'

export async function GET() {
  try {
    const user = await requireAuth()

    const wishlistItems = await db.wishlist.findMany({
      where: { userId: user.id },
      include: {
        product: {
          include: {
            shop: {
              select: { id: true, name: true, image: true, rating: true },
            },
            category: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
      orderBy: { id: 'desc' },
    })

    return NextResponse.json({ wishlistItems })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}

const addToWishlistSchema = z.object({
  productId: z.string().min(1, 'Vui lòng chọn sản phẩm'),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { productId } = addToWishlistSchema.parse(body)

    // Check product exists
    const product = await db.product.findUnique({ where: { id: productId } })
    if (!product) {
      return NextResponse.json(
        { error: 'Không tìm thấy sản phẩm' },
        { status: 404 }
      )
    }

    // Check if already in wishlist
    const existing = await db.wishlist.findUnique({
      where: {
        userId_productId: { userId: user.id, productId },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Sản phẩm đã có trong danh sách yêu thích' },
        { status: 409 }
      )
    }

    const wishlistItem = await db.wishlist.create({
      data: {
        userId: user.id,
        productId,
      },
      include: {
        product: {
          include: {
            shop: { select: { id: true, name: true, image: true, rating: true } },
            category: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    })

    return NextResponse.json(
      { wishlistItem, message: 'Đã thêm vào danh sách yêu thích' },
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
