import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { sanitizeForStorage } from '@/lib/sanitize'
import { z } from 'zod/v4'

export async function GET() {
  try {
    const user = await requireRole('SELLER', 'ADMIN')

    const shop = await db.shop.findUnique({ where: { ownerId: user.id } })
    if (!shop) {
      return NextResponse.json({ products: [] })
    }

    const products = await db.product.findMany({
      where: { shopId: shop.id },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { orderItems: true, reviews: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ products })
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

const createProductSchema = z.object({
  name: z.string().min(2, 'Tên sản phẩm phải có ít nhất 2 ký tự').max(200, 'Tên sản phẩm quá dài'),
  description: z.string().max(5000, 'Mô tả quá dài').optional(),
  price: z.number().positive('Giá phải lớn hơn 0').max(1000000000, 'Giá quá lớn'),
  originalPrice: z.number().positive().max(1000000000, 'Giá gốc quá lớn').optional(),
  image: z.string().max(2000, 'URL hình ảnh quá dài').optional(),
  unit: z.string().max(50, 'Đơn vị quá dài').default('kg'),
  inStock: z.boolean().default(true),
  categoryId: z.string().min(1, 'Vui lòng chọn danh mục'),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('SELLER', 'ADMIN')
    const body = await request.json()
    const data = createProductSchema.parse(body)

    const shop = await db.shop.findUnique({ where: { ownerId: user.id } })
    if (!shop) {
      return NextResponse.json(
        { error: 'Bạn chưa có cửa hàng' },
        { status: 400 }
      )
    }

    // Sanitize text inputs
    const sanitizedName = sanitizeForStorage(data.name)
    const sanitizedDescription = data.description ? sanitizeForStorage(data.description) : null

    const product = await db.product.create({
      data: {
        name: sanitizedName,
        description: sanitizedDescription,
        price: data.price,
        originalPrice: data.originalPrice,
        image: data.image,
        unit: data.unit,
        inStock: data.inStock,
        categoryId: data.categoryId,
        shopId: shop.id,
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        shop: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(
      { product, message: 'Đã tạo sản phẩm' },
      { status: 201 }
    )
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
