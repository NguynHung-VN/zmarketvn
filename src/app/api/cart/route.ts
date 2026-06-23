import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { rateLimiters } from '@/lib/rate-limit'
import { z } from 'zod/v4'
import { addToCartSchema } from '@/modules/cart/schema'
import { getCart, addToCart, ServiceError } from '@/modules/cart/service'

export async function GET() {
  try {
    const user = await requireAuth()
    const result = await getCart(user.id)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const rateLimitResponse = rateLimiters.cart(request)
    if (rateLimitResponse) return rateLimitResponse

    const user = await requireAuth()
    const body = await request.json()
    const { productId, variantId, quantity } = addToCartSchema.parse(body)

    const result = await addToCart(user.id, { productId, variantId, quantity })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
