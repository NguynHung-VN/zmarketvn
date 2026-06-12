import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''

    const where: Record<string, unknown> = { isActive: true }
    if (search) {
      where.name = { contains: search }
    }

    const shops = await db.shop.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: { products: { where: { inStock: true } } },
        },
      },
      orderBy: { rating: 'desc' },
    })

    return NextResponse.json({ shops })
  } catch {
    return NextResponse.json(
      { error: 'Lỗi server' },
      { status: 500 }
    )
  }
}
