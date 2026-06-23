import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { searchUsers } from '@/modules/chat/service'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '20')), 50)

    const users = await searchUsers(user.id, search, limit)

    return NextResponse.json({ users })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
