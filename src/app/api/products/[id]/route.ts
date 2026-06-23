import { NextRequest, NextResponse } from 'next/server'
import { getProductDetail, ServiceError } from '@/modules/catalog/service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const product = await getProductDetail(id)
    return NextResponse.json({ product })
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json(
      { error: 'Lỗi server' },
      { status: 500 }
    )
  }
}
