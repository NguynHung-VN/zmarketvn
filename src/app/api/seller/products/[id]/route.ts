import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { sanitizeForStorage } from '@/lib/sanitize'
import { z } from 'zod/v4'
import { updateProductSchema } from '@/modules/catalog/schema'
import { updateProduct, deleteProduct, ServiceError } from '@/modules/catalog/service'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole('SELLER', 'ADMIN')
    const { id } = await params
    const body = await request.json()
    const data = updateProductSchema.parse(body)

    // Sanitize text inputs
    const updateData: Record<string, any> = {}
    if (data.name) updateData.name = sanitizeForStorage(data.name)
    if (data.description !== undefined) updateData.description = data.description ? sanitizeForStorage(data.description) : null
    if (data.longDescription !== undefined) updateData.longDescription = data.longDescription
    if (data.price !== undefined) updateData.price = data.price
    if (data.originalPrice !== undefined) updateData.originalPrice = data.originalPrice
    if (data.images !== undefined) updateData.images = data.images
    if (data.image !== undefined) updateData.image = data.image
    if (data.unit !== undefined) updateData.unit = data.unit
    if (data.inStock !== undefined) updateData.inStock = data.inStock
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId
    if (data.lowStockThreshold !== undefined) updateData.lowStockThreshold = data.lowStockThreshold
    if (data.sku !== undefined) updateData.sku = data.sku
    if (data.weightGram !== undefined) updateData.weightGram = data.weightGram
    if (data.origin !== undefined) updateData.origin = data.origin
    if (data.storageInfo !== undefined) updateData.storageInfo = data.storageInfo
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.variants !== undefined) updateData.variants = data.variants
    if (data.stockQuantity !== undefined) updateData.stockQuantity = data.stockQuantity

    const updated = await updateProduct(id, user.id, updateData)

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
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Lỗi server' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole('SELLER', 'ADMIN')
    const { id } = await params

    await deleteProduct(id, user.id)

    return NextResponse.json({ message: 'Đã xóa sản phẩm' })
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json(
        { error: error.message === 'Unauthorized' ? 'Chưa đăng nhập' : 'Không có quyền truy cập' },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      )
    }
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
