import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { rateLimiters } from '@/lib/rate-limit'
import { sanitizeForStorage } from '@/lib/sanitize'
import { z } from 'zod/v4'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const status = searchParams.get('status') || ''
    const type = searchParams.get('type') || ''
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    // Admin sees all, user sees their own
    if (user.role !== 'ADMIN') {
      where.userId = user.id
    }

    if (status) {
      where.status = status
    }

    if (type) {
      where.type = type
    }

    const [feedbacks, total] = await Promise.all([
      db.feedback.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          replier: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.feedback.count({ where }),
    ])

    return NextResponse.json({
      feedbacks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}

const createFeedbackSchema = z.object({
  subject: z.string().min(3, 'Tiêu đề phải có ít nhất 3 ký tự').max(200, 'Tiêu đề quá dài'),
  content: z.string().min(10, 'Nội dung phải có ít nhất 10 ký tự').max(5000, 'Nội dung quá dài'),
  type: z
    .enum(['FEEDBACK', 'COMPLAINT', 'SUGGESTION', 'BUG_REPORT'])
    .default('FEEDBACK'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
})

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const rateLimitResponse = rateLimiters.feedback(request)
    if (rateLimitResponse) return rateLimitResponse

    const user = await requireAuth()

    // Admin should not submit feedback
    if (user.role === 'ADMIN') {
      return NextResponse.json(
        { error: 'Quản trị viên không thể gửi phản hồi' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = createFeedbackSchema.parse(body)

    const feedback = await db.feedback.create({
      data: {
        subject: sanitizeForStorage(data.subject),
        content: sanitizeForStorage(data.content),
        type: data.type,
        priority: data.priority,
        userId: user.id,
        status: 'PENDING',
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    })

    return NextResponse.json(
      { feedback, message: 'Đã gửi phản hồi' },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
