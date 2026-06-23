// src/modules/inventory/service.ts
import { prisma } from '@/lib/prisma'
import { ServiceError } from '../order/service'

/** Nhập kho: tăng stockQuantity + ghi StockMovement IMPORT */
export async function importStock(params: {
  productId: string
  variantId?: string
  quantity: number
  note?: string
  userId: string
}) {
  if (params.quantity <= 0) throw new ServiceError(400, 'Số lượng nhập phải > 0')

  return prisma.$transaction(async (tx) => {
    if (params.variantId) {
      await tx.productVariant.update({
        where: { id: params.variantId },
        data: { stockQuantity: { increment: params.quantity } },
      })
    } else {
      await tx.product.update({
        where: { id: params.productId },
        data: { stockQuantity: { increment: params.quantity } },
      })
    }

    return tx.stockMovement.create({
      data: {
        productId: params.productId,
        variantId: params.variantId,
        delta: params.quantity,
        reason: 'IMPORT',
        note: params.note,
        userId: params.userId,
      },
    })
  })
}

/** Điều chỉnh kho (set số lượng tuyệt đối) + ghi ADJUST */
export async function adjustStock(params: {
  productId: string
  variantId?: string
  newQuantity: number
  note?: string
  userId: string
}) {
  if (params.newQuantity < 0) throw new ServiceError(400, 'Tồn kho không thể âm')

  return prisma.$transaction(async (tx) => {
    let oldQuantity: number
    if (params.variantId) {
      const v = await tx.productVariant.findUnique({ where: { id: params.variantId } })
      if (!v) throw new ServiceError(404, 'Không tìm thấy biến thể')
      oldQuantity = v.stockQuantity
      await tx.productVariant.update({
        where: { id: params.variantId },
        data: { stockQuantity: params.newQuantity },
      })
    } else {
      const p = await tx.product.findUnique({ where: { id: params.productId } })
      if (!p) throw new ServiceError(404, 'Không tìm thấy sản phẩm')
      oldQuantity = p.stockQuantity
      await tx.product.update({
        where: { id: params.productId },
        data: { stockQuantity: params.newQuantity },
      })
    }

    const delta = params.newQuantity - oldQuantity
    return tx.stockMovement.create({
      data: {
        productId: params.productId,
        variantId: params.variantId,
        delta,
        reason: 'ADJUST',
        note: params.note || `Điều chỉnh từ ${oldQuantity} → ${params.newQuantity}`,
        userId: params.userId,
      },
    })
  })
}

/** Lấy danh sách sản phẩm sắp hết hàng (seller) */
export async function getLowStockProducts(shopId: string) {
  const products = await prisma.product.findMany({
    where: { shopId, isActive: true },
    include: { variants: true, category: true },
  })
  return products
    .filter((p) => p.stockQuantity <= p.lowStockThreshold)
    .sort((a, b) => a.stockQuantity - b.stockQuantity)
}

/** Lịch sử xuất/nhập kho của 1 sản phẩm */
export async function getStockHistory(productId: string, limit = 50) {
  return prisma.stockMovement.findMany({
    where: { productId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}
