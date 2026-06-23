import { z } from 'zod'

export const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1),
    variantId: z.string().optional(),
    quantity: z.number().int().positive().max(999),
  })).min(1, 'Phải có ít nhất 1 sản phẩm'),
  shippingName: z.string().min(2, 'Tên quá ngắn'),
  shippingPhone: z.string().regex(/^0\d{9,10}$/, 'Số điện thoại không hợp lệ'),
  shippingAddress: z.string().min(5, 'Địa chỉ quá ngắn'),
  paymentMethod: z.enum(['COD', 'VNPAY', 'MOMO']),
  note: z.string().max(500).optional(),
  scheduledTime: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
})

export const cancelOrderSchema = z.object({
  reason: z.string().max(500).optional(),
})

export const updateStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'PREPARING', 'READY', 'SHIPPING', 'DELIVERING', 'DELIVERED']),
})
