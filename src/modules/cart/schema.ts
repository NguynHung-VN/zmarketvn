import { z } from 'zod/v4'

export const addToCartSchema = z.object({
  productId: z.string().min(1, 'Vui lòng chọn sản phẩm'),
  variantId: z.string().optional().nullable(),
  quantity: z.number().int().min(1, 'Số lượng phải lớn hơn 0').max(100, 'Số lượng quá lớn').default(1),
})

export const updateCartSchema = z.object({
  quantity: z.number().int().min(1, 'Số lượng phải lớn hơn 0').max(100, 'Số lượng quá lớn'),
})
