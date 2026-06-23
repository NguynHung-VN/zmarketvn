// src/app/api/review/route.ts
import { NextResponse } from 'next/server'
import { requireAuth, errorResponse } from '@/lib/auth'
import { createReview } from '@/modules/review/service'
import { ServiceError } from '@/modules/order/service'
import { z } from 'zod'

const reviewSchema = z.object({
  productId: z.string().min(1),
  orderId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
  images: z.array(z.string()).max(5).optional(),
})

export async function POST(request: Request) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const parsed = reviewSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ', fields: parsed.error.flatten() }, { status: 400 })
    }
    const review = await createReview({ ...parsed.data, userId: session.id })
    return NextResponse.json({ review }, { status: 201 })
  } catch (error) {
    if (error instanceof ServiceError) return NextResponse.json({ error: error.message }, { status: error.statusCode })
    return errorResponse(error)
  }
}
