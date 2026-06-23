import { db as prisma } from '@/lib/db'
import { pushChatMessage } from '@/lib/realtime'
import { sanitizeForStorage } from '@/lib/sanitize'

export class ServiceError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
    this.name = 'ServiceError'
  }
}

export async function getConversations(userId: string, role: string) {
  let conversations: any[] = []
  if (role === 'SELLER') {
    const shop = await prisma.shop.findUnique({ where: { ownerId: userId } })
    if (shop) {
      conversations = await prisma.conversation.findMany({
        where: { shopId: shop.id },
        include: {
          user: {
            select: { id: true, name: true, avatar: true, role: true },
          },
          shop: {
            include: {
              owner: {
                select: { id: true, name: true, avatar: true, role: true },
              },
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              content: true,
              imageUrl: true,
              senderId: true,
              createdAt: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      })
    }
  } else {
    conversations = await prisma.conversation.findMany({
      where: { userId },
      include: {
        user: {
          select: { id: true, name: true, avatar: true, role: true },
        },
        shop: {
          include: {
            owner: {
              select: { id: true, name: true, avatar: true, role: true },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            content: true,
            imageUrl: true,
            senderId: true,
            createdAt: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })
  }

  const conversationsWithUnread = await Promise.all(
    conversations.map(async (conv) => {
      const unreadCount = await prisma.message.count({
        where: {
          conversationId: conv.id,
          senderId: { not: userId },
          isRead: false,
        },
      })

      const otherUser = role === 'SELLER' ? conv.user : (conv.shop?.owner || null)
      const lastMsg = conv.messages[0]
      const lastMessage = lastMsg ? {
        ...lastMsg,
        type: lastMsg.imageUrl ? 'IMAGE' : 'TEXT'
      } : null

      return {
        id: conv.id,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        otherUser,
        lastMessage,
        unreadCount,
      }
    })
  )

  return conversationsWithUnread
}

export async function createConversation(userId: string, targetUserId: string) {
  if (targetUserId === userId) {
    throw new ServiceError(400, 'Không thể tạo hội thoại với chính mình')
  }

  const sellerShop = await prisma.shop.findUnique({
    where: { ownerId: targetUserId },
    include: { owner: { select: { id: true, name: true, avatar: true, role: true } } },
  })

  if (!sellerShop) {
    throw new ServiceError(404, 'Sạp hàng của người nhận không tồn tại')
  }

  let conversation = await prisma.conversation.findUnique({
    where: {
      userId_shopId: {
        userId,
        shopId: sellerShop.id,
      },
    },
    include: {
      user: { select: { id: true, name: true, avatar: true, role: true } },
      shop: {
        include: {
          owner: { select: { id: true, name: true, avatar: true, role: true } },
        },
      },
    },
  })

  let isExisting = true

  if (!conversation) {
    isExisting = false
    conversation = await prisma.conversation.create({
      data: {
        userId,
        shopId: sellerShop.id,
      },
      include: {
        user: { select: { id: true, name: true, avatar: true, role: true } },
        shop: {
          include: {
            owner: { select: { id: true, name: true, avatar: true, role: true } },
          },
        },
      },
    })
  }

  // Determine user to return
  const otherUser = conversation.shop?.owner || conversation.user

  return {
    conversation: {
      id: conversation.id,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      otherUser,
      lastMessage: null,
      unreadCount: 0,
    },
    existing: isExisting,
  }
}

export async function getMessages(conversationId: string, userId: string, page: number, limit: number) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { shop: { select: { ownerId: true } } },
  })

  if (!conversation) {
    throw new ServiceError(404, 'Không tìm thấy cuộc trò chuyện')
  }

  const isBuyer = conversation.userId === userId
  const isSeller = conversation.shop?.ownerId === userId

  if (!isBuyer && !isSeller) {
    throw new ServiceError(403, 'Không có quyền truy cập')
  }

  // Mark incoming messages as read
  await prisma.message.updateMany({
    where: {
      conversationId,
      senderId: { not: userId },
      isRead: false,
    },
    data: {
      isRead: true,
    },
  })

  const skip = (page - 1) * limit

  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        sender: {
          select: { id: true, name: true, avatar: true },
        },
      },
    }),
    prisma.message.count({ where: { conversationId } }),
  ])

  const formattedMessages = messages.map(msg => ({
    ...msg,
    type: msg.imageUrl ? 'IMAGE' : 'TEXT'
  }))

  return {
    messages: formattedMessages.reverse(),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export async function sendMessage(
  userId: string,
  params: { conversationId: string; content: string; type: 'TEXT' | 'IMAGE' | 'SYSTEM'; imageUrl?: string | null }
) {
  const sanitizedContent = sanitizeForStorage(params.content)

  const conversation = await prisma.conversation.findUnique({
    where: { id: params.conversationId },
    include: { shop: { select: { ownerId: true } } },
  })

  if (!conversation) {
    throw new ServiceError(404, 'Không tìm thấy cuộc trò chuyện')
  }

  const isBuyer = conversation.userId === userId
  const isSeller = conversation.shop?.ownerId === userId

  if (!isBuyer && !isSeller) {
    throw new ServiceError(403, 'Không có quyền gửi tin nhắn trong cuộc trò chuyện này')
  }

  if (params.type === 'IMAGE' && !params.imageUrl) {
    throw new ServiceError(400, 'Tin nhắn hình ảnh cần có URL hình ảnh')
  }

  const message = await prisma.message.create({
    data: {
      content: sanitizedContent,
      imageUrl: params.imageUrl || null,
      conversationId: params.conversationId,
      senderId: userId,
    },
    include: {
      sender: {
        select: { id: true, name: true, avatar: true },
      },
    },
  })

  // Update conversation's updatedAt timestamp
  await prisma.conversation.update({
    where: { id: params.conversationId },
    data: { updatedAt: new Date() },
  })

  const formattedMessage = {
    ...message,
    type: message.imageUrl ? 'IMAGE' : 'TEXT',
  }

  // Push realtime message via Pusher
  try {
    await pushChatMessage(params.conversationId, formattedMessage)
  } catch (e) {
    console.error('[Realtime] Failed to push chat message:', e)
  }

  return formattedMessage
}

export async function searchUsers(userId: string, search: string, limit: number) {
  const where: Record<string, any> = {
    id: { not: userId },
    isActive: true,
  }

  if (search) {
    where.OR = [
      { name: { contains: search } },
    ]
  }

  return prisma.user.findMany({
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
}
