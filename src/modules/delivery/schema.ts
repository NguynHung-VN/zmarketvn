import { z } from 'zod/v4'

export const updateDeliverySchema = z.object({
  status: z.enum(['SHIPPING', 'DELIVERED']),
})
