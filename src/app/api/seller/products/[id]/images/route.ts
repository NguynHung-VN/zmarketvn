import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireRole } from '@/lib/auth'
import { z } from 'zod/v4'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id } = await params

    const product = await db.product.findUnique({
      where: { id },
      select: { images: true },
    })

    if (!product) {
      return NextResponse.json({ error: 'Không tìm thấy sản phẩm' }, { status: 404 })
    }

    const images = product.images.map((url, index) => ({
      id: url,
      url,
      productId: id,
      order: index,
    }))

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

    const shop = await db.shop.findUnique({ where: { ownerId: user.id } })
    if (!shop && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Bạn chưa có cửa hàng' },
        { status: 400 }
      )
    }

    const product = await db.product.findFirst({
      where: { id, ...(shop ? { shopId: shop.id } : {}) },
      select: { id: true, images: true },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Không tìm thấy sản phẩm' },
        { status: 404 }
      )
    }

    const currentImages = [...product.images]
    let targetIndex = data.order ?? currentImages.length
    targetIndex = Math.min(Math.max(0, targetIndex), currentImages.length)
    currentImages.splice(targetIndex, 0, data.url)

    await db.product.update({
      where: { id },
      data: {
        images: currentImages,
        image: currentImages[0] || null,
      },
    })

    const image = {
      id: data.url,
      url: data.url,
      productId: id,
      order: targetIndex,
    }

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

    const shop = await db.shop.findUnique({ where: { ownerId: user.id } })
    if (!shop && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Bạn chưa có cửa hàng' },
        { status: 400 }
      )
    }

    const product = await db.product.findFirst({
      where: { id, ...(shop ? { shopId: shop.id } : {}) },
      select: { id: true, images: true },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Không tìm thấy sản phẩm' },
        { status: 404 }
      )
    }

    // Filter out the deleted image URL (which was mapped as the imageId)
    // We also support the case where imageId is index-based or contains the URL
    const currentImages = product.images.filter((url, index) => {
      const isMatchById = url === data.imageId || `${id}-image-${index}` === data.imageId
      return !isMatchById
    })

    await db.product.update({
      where: { id },
      data: {
        images: currentImages,
        image: currentImages[0] || null,
      },
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
