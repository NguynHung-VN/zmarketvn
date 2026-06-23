// src/app/api/seller/inventory/route.ts
import { NextResponse } from 'next/server'
import { requireRole, errorResponse } from '@/lib/auth'
import { importStockSchema, adjustStockSchema } from '@/modules/inventory/schema'
import { importStock, adjustStock, getLowStockProducts, getStockHistory } from '@/modules/inventory/service'
import { prisma } from '@/lib/prisma'

// GET — danh sách kho + sắp hết
export async function GET(request: Request) {
  try {
    const session = await requireRole('SELLER')
    const shop = await prisma.shop.findUnique({ where: { ownerId: session.id } })
    if (!shop) return NextResponse.json({ error: 'Chưa có sạp' }, { status: 404 })

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter')

    if (filter === 'low-stock') {
      const products = await getLowStockProducts(shop.id)
      return NextResponse.json({ products })
    }

    if (searchParams.get('productId')) {
      const history = await getStockHistory(searchParams.get('productId')!)
      return NextResponse.json({ history })
    }

    const products = await prisma.product.findMany({
      where: { shopId: shop.id },
      include: { variants: true, category: true },
      orderBy: { stockQuantity: 'asc' },
    })
    return NextResponse.json({ products })
  } catch (error) {
    return errorResponse(error)
  }
}

// POST — nhập kho
export async function POST(request: Request) {
  try {
    const session = await requireRole('SELLER')
    const body = await request.json()
    const parsed = importStockSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ', fields: parsed.error.flatten() }, { status: 400 })
    }
    const movement = await importStock({ ...parsed.data, userId: session.id })
    return NextResponse.json({ movement }, { status: 201 })
  } catch (error) {
    return errorResponse(error)
  }
}

// PATCH — điều chỉnh kho
export async function PATCH(request: Request) {
  try {
    const session = await requireRole('SELLER')
    const body = await request.json()
    const parsed = adjustStockSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 })
    }
    const movement = await adjustStock({ ...parsed.data, userId: session.id })
    return NextResponse.json({ movement })
  } catch (error) {
    return errorResponse(error)
  }
}
