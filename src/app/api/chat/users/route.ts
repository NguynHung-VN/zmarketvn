import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// GET /api/chat/users - Search users for new conversations
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '20')), 50)

    const where: Record<string, unknown> = {
      id: { not: user.id },
      isActive: true,
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
      ]
    }

    const users = await db.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        avatar: true,
        role: true,
      },
      take: limit,
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ users })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
