import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { errorResponse } from '@/lib/auth'
import { createOrderSchema } from '@/modules/order/schema'
import { createOrder, ServiceError } from '@/modules/order/service'
import { rateLimiters } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = rateLimiters.createOrder(request)
    if (rateLimitResponse) return rateLimitResponse

    const session = await requireAuth()
    const body = await request.json()
    const parsed = createOrderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }
    const result = await createOrder({ ...parsed.data, userId: session.id })
    return NextResponse.json({ order: result.order, paymentUrl: result.paymentUrl }, { status: 201 })
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return errorResponse(error)
  }
}

// GET — list orders của user hiện tại
export async function GET() {
  try {
    const session = await requireAuth()
    const { prisma } = await import('@/lib/prisma')
    const orders = await prisma.order.findMany({
      where: { userId: session.id },
      include: { items: true, shop: { select: { name: true, image: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ orders })
  } catch (error) {
    return errorResponse(error)
  }
}
