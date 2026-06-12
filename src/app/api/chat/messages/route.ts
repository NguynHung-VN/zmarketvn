import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { rateLimiters } from '@/lib/rate-limit'
import { sanitizeForStorage } from '@/lib/sanitize'
import { z } from 'zod/v4'

const sendMessageSchema = z.object({
  conversationId: z.string().min(1, 'Vui lòng chọn cuộc trò chuyện'),
  content: z.string().min(1, 'Nội dung tin nhắn không được để trống').max(5000, 'Tin nhắn quá dài'),
  type: z.enum(['TEXT', 'IMAGE', 'SYSTEM']).default('TEXT'),
  imageUrl: z.string().max(2000, 'URL hình ảnh quá dài').optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Rate limiting for chat messages
    const rateLimitResponse = rateLimiters.chatMessage(request)
    if (rateLimitResponse) return rateLimitResponse

    const user = await requireAuth()
    const body = await request.json()
    const data = sendMessageSchema.parse(body)

    // Sanitize content for storage
    const sanitizedContent = sanitizeForStorage(data.content)

    // Verify user is a participant in the conversation
    const participant = await db.participant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: data.conversationId,
          userId: user.id,
        },
      },
    })

    if (!participant) {
      return NextResponse.json(
        { error: 'Không có quyền gửi tin nhắn trong cuộc trò chuyện này' },
        { status: 403 }
      )
    }

    // Verify conversation exists
    const conversation = await db.conversation.findUnique({
      where: { id: data.conversationId },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Không tìm thấy cuộc trò chuyện' },
        { status: 404 }
      )
    }

    // If type is IMAGE, imageUrl is required
    if (data.type === 'IMAGE' && !data.imageUrl) {
      return NextResponse.json(
        { error: 'Tin nhắn hình ảnh cần có URL hình ảnh' },
        { status: 400 }
      )
    }

    // Create message
    const message = await db.message.create({
      data: {
        content: sanitizedContent,
        type: data.type,
        imageUrl: data.imageUrl || null,
        conversationId: data.conversationId,
        senderId: user.id,
      },
      include: {
        sender: {
          select: { id: true, name: true, avatar: true },
        },
      },
    })

    // Update conversation's updatedAt timestamp
    await db.conversation.update({
      where: { id: data.conversationId },
      data: { updatedAt: new Date() },
    })

    return NextResponse.json(
      { message, msg: 'Đã gửi tin nhắn' },
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
