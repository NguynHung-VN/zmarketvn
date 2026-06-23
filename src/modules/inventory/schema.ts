import { z } from 'zod'

export const importStockSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional(),
  quantity: z.number().int().positive().max(100000),
  note: z.string().max(500).optional(),
})

export const adjustStockSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional(),
  newQuantity: z.number().int().min(0).max(100000),
  note: z.string().max(500).optional(),
})
