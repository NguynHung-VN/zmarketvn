import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const wishlistItem = await db.wishlistItem.findUnique({
      where: { id },
    })

    if (!wishlistItem) {
      return NextResponse.json(
        { error: 'Không tìm thấy mục yêu thích' },
        { status: 404 }
      )
    }

    if (wishlistItem.userId !== user.id) {
      return NextResponse.json(
        { error: 'Không có quyền xóa' },
        { status: 403 }
      )
    }

    await db.wishlistItem.delete({ where: { id } })

    return NextResponse.json({ message: 'Đã xóa khỏi danh sách yêu thích' })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
