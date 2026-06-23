import { NextResponse } from 'next/server'
import { requireAuth, errorResponse } from '@/lib/auth'
import { createVnpayPaymentUrl } from '@/lib/vnpay'
import { prisma } from '@/lib/prisma'

// POST /api/payment/create — tạo URL thanh toán VNPay cho đơn đã có
export async function POST(request: Request) {
  try {
    const session = await requireAuth()
    const { orderId } = await request.json()

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    })
    if (!order) return NextResponse.json({ error: 'Không tìm thấy đơn' }, { status: 404 })
    if (order.userId !== session.id) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
    if (order.paymentStatus === 'PAID') return NextResponse.json({ error: 'Đơn đã thanh toán' }, { status: 400 })

    const paymentUrl = createVnpayPaymentUrl({
      txnRef: order.orderCode,
      amount: order.total,
      orderInfo: `Thanh toan don hang ${order.orderCode}`,
    })

    if (order.payment) {
      await prisma.payment.update({
        where: { orderId },
        data: { payUrl: paymentUrl, provider: 'VNPAY' },
      })
    }

    return NextResponse.json({ paymentUrl })
  } catch (error) {
    return errorResponse(error)
  }
}
