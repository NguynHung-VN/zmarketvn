import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getStats } from '@/modules/admin/service'

export async function GET() {
  try {
    await requireRole('ADMIN')
    const result = await getStats()
    return NextResponse.json(result)
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
