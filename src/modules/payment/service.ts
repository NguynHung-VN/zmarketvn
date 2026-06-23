// src/modules/payment/service.ts
import { prisma } from '@/lib/prisma'
import { verifyVnpayCallback } from '@/lib/vnpay'
import { pushOrderUpdate } from '@/lib/realtime'
import { ServiceError } from '../order/service'

/**
 * Xử lý VNPay IPN webhook — IDEMPOTENT.
 * Gọi nhiều lần không cộng tiền 2 lần.
 */
export async function handleVnpayWebhook(queryParams: Record<string, string>) {
  const verify = verifyVnpayCallback(queryParams)

  if (!verify.isValid) {
    return { RspCode: '97', Message: 'Checksum failed' }
  }

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { txnRef: verify.txnRef },
      include: { order: true },
    })

    if (!payment) {
      return { RspCode: '01', Message: 'Order not found' }
    }

    // ── IDEMPOTENCY: nếu đã PAID rồi, trả OK nhưng không làm gì ──
    if (payment.status === 'PAID') {
      return { RspCode: '00', Message: 'Confirm Success' }
    }

    // Tăng webhook count
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        webhookCount: { increment: 1 },
        providerTxnId: queryParams['vnp_BankTranNo'],
        rawData: JSON.stringify(queryParams),
      },
    })

    // ResponseCode 00 = thành công
    if (verify.responseCode === '00') {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'PAID', paidAt: new Date() },
      })
      await tx.order.update({
        where: { id: payment.orderId },
        data: { paymentStatus: 'PAID' },
      })
      await pushOrderUpdate(payment.orderId, 'PAID')
    } else {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      })
      await tx.order.update({
        where: { id: payment.orderId },
        data: { paymentStatus: 'FAILED' },
      })
    }

    return { RspCode: '00', Message: 'Confirm Success' }
  })
}
