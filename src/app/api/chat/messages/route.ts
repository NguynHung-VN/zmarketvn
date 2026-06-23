import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { rateLimiters } from '@/lib/rate-limit'
import { z } from 'zod/v4'
import { sendMessageSchema } from '@/modules/chat/schema'
import { sendMessage, ServiceError } from '@/modules/chat/service'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting for chat messages
    const rateLimitResponse = rateLimiters.chatMessage(request)
    if (rateLimitResponse) return rateLimitResponse

    const user = await requireAuth()
    const body = await request.json()
    const data = sendMessageSchema.parse(body)

    const formattedMessage = await sendMessage(user.id, data)

    return NextResponse.json(
      { message: formattedMessage, msg: 'Đã gửi tin nhắn' },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
