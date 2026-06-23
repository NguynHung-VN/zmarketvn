import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { rateLimiters } from '@/lib/rate-limit'
import { z } from 'zod/v4'
import { createConversationSchema } from '@/modules/chat/schema'
import { getConversations, createConversation, ServiceError } from '@/modules/chat/service'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const conversations = await getConversations(user.id, user.role)
    return NextResponse.json({ conversations })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = rateLimiters.createConversation(request)
    if (rateLimitResponse) return rateLimitResponse

    const user = await requireAuth()
    const body = await request.json()
    const { targetUserId } = createConversationSchema.parse(body)

    const result = await createConversation(user.id, targetUserId)

    return NextResponse.json(result)
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
