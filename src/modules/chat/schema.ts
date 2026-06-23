import { z } from 'zod/v4'

export const createConversationSchema = z.object({
  targetUserId: z.string().min(1, 'Vui lòng chọn người dùng'),
})

export const sendMessageSchema = z.object({
  conversationId: z.string().min(1, 'Vui lòng chọn cuộc trò chuyện'),
  content: z.string().min(1, 'Nội dung tin nhắn không được để trống').max(5000, 'Tin nhắn quá dài'),
  type: z.enum(['TEXT', 'IMAGE', 'SYSTEM']).default('TEXT'),
  imageUrl: z.string().max(2000, 'URL hình ảnh quá dài').optional().nullable(),
})
