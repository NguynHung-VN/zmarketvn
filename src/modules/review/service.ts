// src/modules/review/service.ts
import { prisma } from '@/lib/prisma'
import { ServiceError } from '../order/service'

/** Tạo đánh giá — chỉ khi đơn DELIVERED (verified purchase) */
export async function createReview(params: {
  userId: string
  productId: string
  orderId: string
  rating: number    // 1..5
  comment?: string
  images?: string[]
}) {
  if (params.rating < 1 || params.rating > 5) throw new ServiceError(400, 'Đánh giá phải từ 1 đến 5 sao')

  return prisma.$transaction(async (tx) => {
    // Kiểm tra đơn hàng đã giao + thuộc user + có sản phẩm này
    const order = await tx.order.findFirst({
      where: {
        id: params.orderId,
        userId: params.userId,
        status: 'DELIVERED',
        items: { some: { productId: params.productId } },
      },
    })
    if (!order) throw new ServiceError(403, 'Chỉ đánh giá được khi đã nhận hàng')

    // Kiểm tra chưa review cho đơn này
    const existing = await tx.review.findUnique({ where: { orderId: params.orderId } })
    if (existing) throw new ServiceError(400, 'Bạn đã đánh giá đơn hàng này')

    // Tạo review
    const review = await tx.review.create({
      data: {
        productId: params.productId,
        orderId: params.orderId,
        userId: params.userId,
        rating: params.rating,
        comment: params.comment || null,
        images: params.images || [],
      },
    })

    // Cập nhật rating trung bình sản phẩm
    const agg = await tx.review.aggregate({
      where: { productId: params.productId },
      _avg: { rating: true },
      _count: true,
    })
    await tx.product.update({
      where: { id: params.productId },
      data: {
        rating: agg._avg.rating || 0,
        reviewCount: agg._count,
      },
    })

    // Cập nhật rating shop
    const shopAgg = await tx.product.aggregate({
      where: { shopId: order.shopId },
      _avg: { rating: true },
    })
    const shopReviewCount = await tx.review.count({
      where: { product: { shopId: order.shopId } },
    })
    await tx.shop.update({
      where: { id: order.shopId },
      data: { rating: shopAgg._avg.rating || 0, reviewCount: shopReviewCount },
    })

    return review
  })
}
