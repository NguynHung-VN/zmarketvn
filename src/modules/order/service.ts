// src/modules/order/service.ts
import { prisma } from '@/lib/prisma'
import { calculateOrderTotal } from '@/lib/money'
import { pushOrderUpdate } from '@/lib/realtime'
import type { Order } from '@prisma/client'

/**
 * Tạo đơn hàng — CHẠY TRONG TRANSACTION.
 * 1. Validate sản phẩm + variant tồn tại & còn hàng
 * 2. Tính tiền ở SERVER (không tin client)
 * 3. Trừ kho + ghi StockMovement
 * 4. Tạo Order + OrderItem + (Payment nếu COD)
 */
export async function createOrder(params: {
  userId: string
  items: { productId: string; variantId?: string; quantity: number }[]
  shippingName: string
  shippingPhone: string
  shippingAddress: string
  paymentMethod: 'COD' | 'VNPAY' | 'MOMO'
  note?: string
  scheduledTime?: Date
}): Promise<{ order: Order; paymentUrl?: string }> {
  return prisma.$transaction(async (tx) => {
    // ── 1. Validate + snapshot sản phẩm ──
    const orderItems: {
      productId: string
      variantId: string | null
      productName: string
      unit: string
      price: number
      quantity: number
      subtotal: number
      weightGram: number
    }[] = []

    let shopId: string | null = null
    let totalWeight = 0

    for (const item of params.items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        include: { shop: true },
      })
      if (!product || !product.isActive) {
        throw new ServiceError(400, `Sản phẩm không tồn tại hoặc đã ngừng bán: ${item.productId}`)
      }
      if (shopId && product.shopId !== shopId) {
        throw new ServiceError(400, 'Không thể đặt hàng từ nhiều sạp khác nhau trong 1 đơn')
      }
      shopId = product.shopId

      let price = product.price
      let stock = product.stockQuantity
      let variantId: string | null = null

      if (item.variantId) {
        const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } })
        if (!variant || variant.productId !== product.id) {
          throw new ServiceError(400, 'Biến thể không hợp lệ')
        }
        price = variant.price
        stock = variant.stockQuantity
        variantId = variant.id
      }

      // ── Kiểm tra kho ──
      if (stock < item.quantity) {
        throw new ServiceError(400, `Không đủ hàng: ${product.name} (còn ${stock} ${product.unit})`)
      }

      const itemSubtotal = price * item.quantity
      totalWeight += (product.weightGram || 500) * item.quantity

      orderItems.push({
        productId: product.id,
        variantId,
        productName: product.name,
        unit: product.unit,
        price,
        quantity: item.quantity,
        subtotal: itemSubtotal,
        weightGram: product.weightGram || 500,
      })

      // ── Trừ kho ──
      if (variantId) {
        await tx.productVariant.update({
          where: { id: variantId },
          data: { stockQuantity: { decrement: item.quantity } },
        })
      } else {
        await tx.product.update({
          where: { id: product.id },
          data: {
            stockQuantity: { decrement: item.quantity },
            soldCount: { increment: item.quantity },
          },
        })
      }

      // ── Ghi StockMovement ──
      await tx.stockMovement.create({
        data: {
          productId: product.id,
          variantId,
          delta: -item.quantity,
          reason: 'SALE',
          userId: params.userId,
        },
      })
    }

    if (!shopId) throw new ServiceError(400, 'Không có sản phẩm hợp lệ')

    // ── 2. Tính tiền SERVER ──
    const shippingFee = calculateShippingFeeByWeight(totalWeight)
    const calc = calculateOrderTotal(
      orderItems.map((i) => ({ price: i.price, quantity: i.quantity })),
      shippingFee,
      0, // discount
    )

    // ── 3. Tạo Order ──
    const orderCode = generateOrderCode()
    const order = await tx.order.create({
      data: {
        orderCode,
        userId: params.userId,
        shopId,
        status: 'PENDING',
        subtotal: calc.subtotal,
        shippingFee: calc.shippingFee,
        discount: calc.discount,
        total: calc.total,
        paymentMethod: params.paymentMethod,
        paymentStatus: 'PENDING',
        shippingName: params.shippingName,
        shippingPhone: params.shippingPhone,
        shippingAddress: params.shippingAddress,
        note: params.note,
        scheduledTime: params.scheduledTime,
        items: {
          create: orderItems.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            productName: i.productName,
            unit: i.unit,
            price: i.price,
            quantity: i.quantity,
            subtotal: i.subtotal,
          })),
        },
      },
      include: { items: true },
    })

    // ── 4. Payment ──
    let paymentUrl: string | undefined
    if (params.paymentMethod === 'VNPAY') {
      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          provider: 'VNPAY',
          status: 'PENDING',
          amount: calc.total,
          txnRef: orderCode,
        },
      })
      // Tạo URL VNPay (xem §3.4)
      const { createVnpayPaymentUrl } = await import('@/lib/vnpay')
      paymentUrl = createVnpayPaymentUrl({
        txnRef: payment.txnRef,
        amount: calc.total,
        orderInfo: `Thanh toan don hang ${orderCode}`,
      })
      await tx.payment.update({ where: { id: payment.id }, data: { payUrl: paymentUrl } })
    } else if (params.paymentMethod === 'COD') {
      await tx.payment.create({
        data: {
          orderId: order.id,
          provider: 'COD',
          status: 'PENDING',
          amount: calc.total,
          txnRef: orderCode,
        },
      })
    }

    // ── 5. Tạo Delivery record ──
    await tx.delivery.create({
      data: { orderId: order.id, status: 'ASSIGNED' },
    })

    // ── 6. Push realtime ──
    await pushOrderUpdate(order.id, 'PENDING')

    return { order, paymentUrl }
  })
}

/**
 * Huỷ đơn hàng — CỘNG LẠI KHO trong transaction.
 */
export async function cancelOrder(orderId: string, userId: string, reason?: string): Promise<Order> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    })
    if (!order) throw new ServiceError(404, 'Không tìm thấy đơn hàng')
    if (order.userId !== userId) throw new ServiceError(403, 'Không có quyền')
    if (order.status === 'DELIVERED') throw new ServiceError(400, 'Không thể huỷ đơn đã giao')
    if (order.status === 'CANCELLED') throw new ServiceError(400, 'Đơn đã huỷ')

    // Cộng lại kho
    for (const item of order.items) {
      if (item.variantId) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stockQuantity: { increment: item.quantity } },
        })
      } else {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: { increment: item.quantity },
            soldCount: { decrement: item.quantity },
          },
        })
      }
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          variantId: item.variantId,
          delta: item.quantity,
          reason: 'CANCEL',
          orderId: order.id,
          userId,
          note: reason,
        },
      })
    }

    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
    })

    await pushOrderUpdate(orderId, 'CANCELLED')
    return updated
  })
}

/**
 * Đổi trạng thái đơn (seller/shipper/admin).
 */
export async function updateOrderStatus(
  orderId: string,
  status: 'CONFIRMED' | 'PREPARING' | 'READY' | 'SHIPPING' | 'DELIVERING' | 'DELIVERED',
  actorId: string,
): Promise<Order> {
  const order = await prisma.order.update({
    where: { id: orderId },
    data: { status },
  })
  await pushOrderUpdate(orderId, status)
  return order
}

// ── Helpers ──
export class ServiceError extends Error {
  constructor(public statusCode: number, message: string) { super(message) }
}

function generateOrderCode(): string {
  return Math.random().toString(36).slice(2, 10)
}

function calculateShippingFeeByWeight(weightGram: number): number {
  const baseFee = 15000
  const perKg = 2000
  const weightKg = Math.ceil(weightGram / 1000)
  return baseFee + weightKg * perKg
}
