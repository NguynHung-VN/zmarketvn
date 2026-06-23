import { NextRequest, NextResponse } from 'next/server'
import { getProducts } from '@/modules/catalog/service'

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

    const result = await getProducts({
      page,
      limit,
      search,
      categoryId,
      shopId,
      sortBy,
      sortOrder,
    })

    return NextResponse.json(result)
  } catch {
    return NextResponse.json(
      { error: 'Lỗi server' },
      { status: 500 }
    )
  }
}
