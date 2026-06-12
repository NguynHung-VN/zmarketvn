import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { sanitizeForStorage } from '@/lib/sanitize'
import { rateLimiters } from '@/lib/rate-limit'
import { z } from 'zod/v4'

// GET /api/chat/conversations - Get all conversations for the current user
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const conversations = await db.conversation.findMany({
      where: {
        participants: {
          some: { userId: user.id },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
                role: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            content: true,
            type: true,
            imageUrl: true,
            senderId: true,
            createdAt: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    // Compute unread count per conversation for current user
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await db.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: user.id },
            isRead: false,
          },
        })

        // Get other participant(s)
        const otherParticipants = conv.participants.filter(
          (p) => p.userId !== user.id
        )

        return {
          id: conv.id,
          type: conv.type,
          name: conv.name,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          otherUser: otherParticipants[0]?.user || null,
          lastMessage: conv.messages[0] || null,
          unreadCount,
        }
      })
    )

    return NextResponse.json({ conversations: conversationsWithUnread })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}

const createConversationSchema = z.object({
  targetUserId: z.string().min(1, 'Vui lòng chọn người dùng'),
  type: z.enum(['DIRECT', 'GROUP', 'SUPPORT']).default('DIRECT'),
  name: z.string().max(200, 'Tên hội thoại quá dài').optional(),
})

// POST /api/chat/conversations - Create a new conversation
export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const rateLimitResponse = rateLimiters.createConversation(request)
    if (rateLimitResponse) return rateLimitResponse

    const user = await requireAuth()
    const body = await request.json()
    const data = createConversationSchema.parse(body)

    if (data.targetUserId === user.id) {
      return NextResponse.json({ error: 'Không thể tạo hội thoại với chính mình' }, { status: 400 })
    }

    // Check if target user exists
    const targetUser = await db.user.findUnique({ where: { id: data.targetUserId } })
    if (!targetUser) {
      return NextResponse.json({ error: 'Người dùng không tồn tại' }, { status: 404 })
    }

    // For DIRECT conversations, check if one already exists
    if (data.type === 'DIRECT') {
      const existing = await db.conversation.findFirst({
        where: {
          type: 'DIRECT',
          participants: {
            every: {
              userId: { in: [user.id, data.targetUserId] },
            },
          },
        },
        include: {
          participants: {
            include: {
              user: {
                select: { id: true, name: true, avatar: true, role: true },
              },
            },
          },
        },
      })

      // Verify it's exactly 2 participants
      if (existing && existing.participants.length === 2) {
        const otherParticipant = existing.participants.find(
          (p) => p.userId !== user.id
        )
        return NextResponse.json({
          conversation: {
            id: existing.id,
            type: existing.type,
            name: existing.name,
            createdAt: existing.createdAt,
            updatedAt: existing.updatedAt,
            otherUser: otherParticipant?.user || null,
            lastMessage: null,
            unreadCount: 0,
          },
          existing: true,
        })
      }
    }

    // Sanitize group name if provided
    const sanitizedName = data.name ? sanitizeForStorage(data.name) : null

    // Create new conversation
    const conversation = await db.conversation.create({
      data: {
        type: data.type,
        name: data.type === 'GROUP' ? sanitizedName : null,
        participants: {
          create: [
            { userId: user.id },
            { userId: data.targetUserId },
          ],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true, role: true },
            },
          },
        },
      },
    })

    const otherParticipant = conversation.participants.find(
      (p) => p.userId !== user.id
    )

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        type: conversation.type,
        name: conversation.name,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        otherUser: otherParticipant?.user || null,
        lastMessage: null,
        unreadCount: 0,
      },
      existing: false,
    })
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
