import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getUsers } from '@/modules/admin/service'

export async function GET(request: NextRequest) {
  try {
    await requireRole('ADMIN')

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '20')), 100)

    const result = await getUsers({ search, role, page, limit })

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
