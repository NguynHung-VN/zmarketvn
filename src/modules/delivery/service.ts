import { db as prisma } from '@/lib/db'

export class ServiceError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
    this.name = 'ServiceError'
  }
}

export async function getDeliveries(shipperId: string, status?: string) {
  const where: Record<string, unknown> = { shipperId }
  if (status) {
    where.status = status
  }

  return prisma.order.findMany({
    where,
    include: {
      buyer: {
        select: { id: true, name: true, phone: true, address: true },
      },
      shop: {
        select: { id: true, name: true, image: true, address: true, phone: true },
      },
      items: {
        include: {
          product: {
            select: { id: true, name: true, image: true, unit: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function updateDeliveryStatus(
  shipperId: string,
  orderId: string,
  status: 'SHIPPING' | 'DELIVERED'
) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, shipperId },
  })

  if (!order) {
    throw new ServiceError(404, 'Không tìm thấy đơn giao hàng')
  }

  // Validate status transition
  if (order.status !== 'PREPARING' && order.status !== 'SHIPPING') {
    throw new ServiceError(400, 'Đơn hàng chưa sẵn sàng để giao')
  }

  if (status === 'SHIPPING' && order.status !== 'PREPARING') {
    throw new ServiceError(400, 'Đơn hàng phải ở trạng thái đang chuẩn bị mới có thể lấy giao')
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status },
      include: {
        buyer: {
          select: { id: true, name: true, phone: true, address: true },
        },
        shop: {
          select: { id: true, name: true, address: true, phone: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, image: true, unit: true },
            },
          },
        },
      },
    })

    // If delivered, update payment status for COD
    if (status === 'DELIVERED' && order.paymentMethod === 'COD') {
      await tx.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'PAID' },
      })
    }

    return updated
  })
}
