import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { sanitizeForStorage } from '@/lib/sanitize'
import { z } from 'zod/v4'

const updateProductSchema = z.object({
  name: z.string().min(2, 'Tên sản phẩm phải có ít nhất 2 ký tự').max(200, 'Tên sản phẩm quá dài').optional(),
  description: z.string().max(5000, 'Mô tả quá dài').optional(),
  price: z.number().positive('Giá phải lớn hơn 0').max(1000000000, 'Giá quá lớn').optional(),
  originalPrice: z.number().positive().max(1000000000, 'Giá gốc quá lớn').optional(),
  image: z.string().max(2000, 'URL hình ảnh quá dài').optional(),
  unit: z.string().max(50, 'Đơn vị quá dài').optional(),
  inStock: z.boolean().optional(),
  categoryId: z.string().optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole('SELLER', 'ADMIN')
    const { id } = await params
    const body = await request.json()
    const data = updateProductSchema.parse(body)

    const shop = await db.shop.findUnique({ where: { ownerId: user.id } })
    if (!shop) {
      return NextResponse.json(
        { error: 'Bạn chưa có cửa hàng' },
        { status: 400 }
      )
    }

    // Verify product belongs to this shop
    const product = await db.product.findFirst({
      where: { id, shopId: shop.id },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Không tìm thấy sản phẩm' },
        { status: 404 }
      )
    }

    // Sanitize text inputs
    const updateData: Record<string, unknown> = {}
    if (data.name) updateData.name = sanitizeForStorage(data.name)
    if (data.description !== undefined) updateData.description = data.description ? sanitizeForStorage(data.description) : null
    if (data.price !== undefined) updateData.price = data.price
    if (data.originalPrice !== undefined) updateData.originalPrice = data.originalPrice
    if (data.image !== undefined) updateData.image = data.image
    if (data.unit) updateData.unit = data.unit
    if (data.inStock !== undefined) updateData.inStock = data.inStock
    if (data.categoryId) updateData.categoryId = data.categoryId

    const updated = await db.product.update({
      where: { id },
      data: updateData,
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        shop: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json({ product: updated, message: 'Đã cập nhật sản phẩm' })
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole('SELLER', 'ADMIN')
    const { id } = await params

    const shop = await db.shop.findUnique({ where: { ownerId: user.id } })
    if (!shop) {
      return NextResponse.json(
        { error: 'Bạn chưa có cửa hàng' },
        { status: 400 }
      )
    }

    const product = await db.product.findFirst({
      where: { id, shopId: shop.id },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Không tìm thấy sản phẩm' },
        { status: 404 }
      )
    }

    // Soft delete - mark as out of stock instead of deleting
    await db.product.update({
      where: { id },
      data: { inStock: false },
    })

    return NextResponse.json({ message: 'Đã xóa sản phẩm' })
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json(
        { error: error.message === 'Unauthorized' ? 'Chưa đăng nhập' : 'Không có quyền truy cập' },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      )
    }
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
