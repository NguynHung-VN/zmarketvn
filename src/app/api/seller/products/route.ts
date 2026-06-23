import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { sanitizeForStorage } from '@/lib/sanitize'
import { z } from 'zod/v4'
import { createProductSchema } from '@/modules/catalog/schema'
import { createProduct, getSellerProducts, ServiceError } from '@/modules/catalog/service'

export async function GET() {
  try {
    const user = await requireRole('SELLER', 'ADMIN')
    const products = await getSellerProducts(user.id)
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

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('SELLER', 'ADMIN')
    const body = await request.json()
    const data = createProductSchema.parse(body)

    // Sanitize text inputs
    const sanitizedName = sanitizeForStorage(data.name)
    const sanitizedDescription = data.description ? sanitizeForStorage(data.description) : undefined

    const images = data.images && data.images.length > 0
      ? data.images
      : data.image ? [data.image] : []

    const product = await createProduct({
      sellerId: user.id,
      name: sanitizedName,
      description: sanitizedDescription,
      longDescription: data.longDescription,
      price: data.price,
      originalPrice: data.originalPrice || undefined,
      unit: data.unit,
      stockQuantity: data.stockQuantity,
      sku: data.sku || undefined,
      images,
      categoryId: data.categoryId,
      weightGram: data.weightGram || undefined,
      origin: data.origin || undefined,
      storageInfo: data.storageInfo || undefined,
      variants: data.variants
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
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Lỗi server' }, { status: 500 })
  }
}
