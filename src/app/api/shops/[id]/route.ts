import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const shop = await db.shop.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
        products: {
          where: { inStock: true },
          include: {
            category: {
              select: { id: true, name: true, slug: true },
            },
          },
          orderBy: { soldCount: 'desc' },
        },
        _count: {
          select: { products: { where: { inStock: true } } },
        },
      },
    })

    if (!shop) {
      return NextResponse.json(
        { error: 'Không tìm thấy cửa hàng' },
        { status: 404 }
      )
    }

    return NextResponse.json({ shop })
  } catch {
    return NextResponse.json(
      { error: 'Lỗi server' },
      { status: 500 }
    )
  }
}
