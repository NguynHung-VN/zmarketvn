import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getDeliveries } from '@/modules/delivery/service'

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole('SHIPPER', 'ADMIN')
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''

    const deliveries = await getDeliveries(user.id, status)

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
