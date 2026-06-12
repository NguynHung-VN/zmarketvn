import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole('SHIPPER', 'ADMIN')
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''

    const where: Record<string, unknown> = { shipperId: user.id }
    if (status) {
      where.status = status
    }

    const deliveries = await db.order.findMany({
      where,
      include: {
        buyer: {
          select: { id: true, name: true, phone: true, address: true },
        },
        shop: {
          select: { id: true, name: true, image: true, address: true, phone: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, image: true, unit: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ deliveries })
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json(
        { error: error.message === 'Unauthorized' ? 'Chưa đăng nhập' : 'Không có quyền truy cập' },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      )
    }
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
