import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireRole } from '@/lib/auth'
import { z } from 'zod/v4'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication to view product images
    await requireAuth()

    const { id } = await params

    const images = await db.productImage.findMany({
      where: { productId: id },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json({ images })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}

const addImageSchema = z.object({
  url: z.string().min(1, 'URL hình ảnh không được để trống').max(2000, 'URL quá dài'),
  order: z.number().int().min(0).max(1000).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole('SELLER', 'ADMIN')
    const { id } = await params
    const body = await request.json()
    const data = addImageSchema.parse(body)

    // Verify product belongs to this seller's shop
    const shop = await db.shop.findUnique({ where: { ownerId: user.id } })
    if (!shop && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Bạn chưa có cửa hàng' },
        { status: 400 }
      )
    }

    const product = await db.product.findFirst({
      where: { id, ...(shop ? { shopId: shop.id } : {}) },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Không tìm thấy sản phẩm' },
        { status: 404 }
      )
    }

    // If order not specified, put it at the end
    let imageOrder = data.order
    if (imageOrder === undefined) {
      const maxOrderImage = await db.productImage.findFirst({
        where: { productId: id },
        orderBy: { order: 'desc' },
        select: { order: true },
      })
      imageOrder = maxOrderImage ? maxOrderImage.order + 1 : 0
    }

    const image = await db.productImage.create({
      data: {
        url: data.url,
        productId: id,
        order: imageOrder,
      },
    })

    return NextResponse.json(
      { image, message: 'Đã thêm hình ảnh' },
      { status: 201 }
    )
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === 'Unauthorized' || error.message === 'Forbidden')
    ) {
      return NextResponse.json(
        {
          error:
            error.message === 'Unauthorized'
              ? 'Chưa đăng nhập'
              : 'Không có quyền truy cập',
        },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      )
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}

const deleteImageSchema = z.object({
  imageId: z.string().min(1, 'ID hình ảnh không được để trống'),
})

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole('SELLER', 'ADMIN')
    const { id } = await params
    const body = await request.json()
    const data = deleteImageSchema.parse(body)

    // Verify product belongs to this seller's shop
    const shop = await db.shop.findUnique({ where: { ownerId: user.id } })
    if (!shop && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Bạn chưa có cửa hàng' },
        { status: 400 }
      )
    }

    const product = await db.product.findFirst({
      where: { id, ...(shop ? { shopId: shop.id } : {}) },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Không tìm thấy sản phẩm' },
        { status: 404 }
      )
    }

    // Find and verify the image belongs to this product
    const image = await db.productImage.findFirst({
      where: { id: data.imageId, productId: id },
    })

    if (!image) {
      return NextResponse.json(
        { error: 'Không tìm thấy hình ảnh' },
        { status: 404 }
      )
    }

    await db.productImage.delete({
      where: { id: data.imageId },
    })

    return NextResponse.json({ message: 'Đã xóa hình ảnh' })
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === 'Unauthorized' || error.message === 'Forbidden')
    ) {
      return NextResponse.json(
        {
          error:
            error.message === 'Unauthorized'
              ? 'Chưa đăng nhập'
              : 'Không có quyền truy cập',
        },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      )
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
