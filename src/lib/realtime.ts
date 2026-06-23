// src/lib/realtime.ts
/**
 * Thay Socket.IO bằng Pusher Channels.
 * Server push event qua Pusher, client subscribe qua pusher-js.
 *
 * Cài: pnpm add pusher pusher-js
 * Env: PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER
 */

import Pusher from 'pusher'

let pusherInstance: Pusher | null = null

export function getPusher(): Pusher | null {
  if (!pusherInstance && process.env.PUSHER_APP_ID) {
    pusherInstance = new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.PUSHER_CLUSTER || 'ap1',
      useTLS: true,
    })
  }
  return pusherInstance
}

/** Gửi tin nhắn chat realtime */
export async function pushChatMessage(conversationId: string, message: unknown) {
  const pusher = getPusher()
  if (!pusher) {
    console.warn('[Realtime] Pusher not configured — message saved to DB only')
    return
  }
  await pusher.trigger(`chat-${conversationId}`, 'new-message', message)
}

/** Gửi cập nhật trạng thái đơn hàng realtime */
export async function pushOrderUpdate(orderId: string, status: string) {
  const pusher = getPusher()
  if (!pusher) return
  await pusher.trigger(`order-${orderId}`, 'status-update', { orderId, status, timestamp: Date.now() })
}
