import { z } from 'zod/v4'

export const updateUserSchema = z.object({
  role: z.enum(['BUYER', 'SELLER', 'SHIPPER', 'ADMIN']).optional(),
  isActive: z.boolean().optional(),
  name: z.string().max(100, 'Tên quá dài').optional(),
  phone: z.string().max(20, 'Số điện thoại quá dài').optional(),
  address: z.string().max(500, 'Địa chỉ quá dài').optional(),
})
