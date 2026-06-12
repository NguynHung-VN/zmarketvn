import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Whitelisted sort fields to prevent injection
const ALLOWED_SORT_FIELDS = ['createdAt', 'price', 'name', 'rating', 'soldCount']
const ALLOWED_SORT_ORDERS = ['asc', 'desc']

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '12')), 100)
    const search = searchParams.get('search') || ''
    const categoryId = searchParams.get('categoryId') || ''
    const shopId = searchParams.get('shopId') || ''
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {
      inStock: true,
    }

    if (search) {
      where.name = { contains: search }
    }

    if (categoryId) {
      where.categoryId = categoryId
    }

    if (shopId) {
      where.shopId = shopId
    }

    // Sanitize sort parameters - only allow whitelisted fields
    const safeSortBy = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : 'createdAt'
    const safeSortOrder = ALLOWED_SORT_ORDERS.includes(sortOrder) ? sortOrder : 'desc'
    const orderBy: Record<string, string> = {}
    orderBy[safeSortBy] = safeSortOrder

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        include: {
          shop: {
            select: {
              id: true,
              name: true,
              image: true,
              rating: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      db.product.count({ where }),
    ])

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'Lỗi server' },
      { status: 500 }
    )
  }
}
