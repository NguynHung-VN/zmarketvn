import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, requireRole } from '@/lib/auth'
import { sanitizeForStorage } from '@/lib/sanitize'
import { z } from 'zod/v4'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }
    const { id } = await params

    const feedback = await db.feedback.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        replier: {
          select: { id: true, name: true },
        },
      },
    })

    if (!feedback) {
      return NextResponse.json(
        { error: 'Không tìm thấy phản hồi' },
        { status: 404 }
      )
    }

    // User can only see their own feedback (admin can see all)
    if (user.role !== 'ADMIN' && feedback.userId !== user.id) {
      return NextResponse.json(
        { error: 'Không có quyền xem phản hồi này' },
        { status: 403 }
      )
    }

    return NextResponse.json({ feedback })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}

const updateFeedbackSchema = z.object({
  status: z
    .enum(['PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])
    .optional(),
  adminReply: z.string().min(1, 'Phản hồi không được để trống').max(5000, 'Phản hồi quá dài').optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole('ADMIN')
    const { id } = await params
    const body = await request.json()
    const data = updateFeedbackSchema.parse(body)

    const feedback = await db.feedback.findUnique({ where: { id } })

    if (!feedback) {
      return NextResponse.json(
        { error: 'Không tìm thấy phản hồi' },
        { status: 404 }
      )
    }

    // Sanitize admin reply
    const sanitizedReply = data.adminReply ? sanitizeForStorage(data.adminReply) : undefined

    const updated = await db.feedback.update({
      where: { id },
      data: {
        ...(data.status && { status: data.status }),
        ...(sanitizedReply !== undefined && {
          adminReply: sanitizedReply,
          repliedBy: user.id,
        }),
        ...(data.priority && { priority: data.priority }),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        replier: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json({
      feedback: updated,
      message: 'Đã cập nhật phản hồi',
    })
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === 'Unauthorized' || error.message === 'Forbidden')
    ) {
      return NextResponse.json(
        {
          error:
            error.message === 'Unauthorized'
              ? 'Chưa đăng nhập'
              : 'Chỉ quản trị viên mới có thể phản hồi',
        },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      )
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
