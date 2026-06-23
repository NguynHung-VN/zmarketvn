// src/lib/realtime-client.ts
/**
 * Client-side Pusher instance for subscribing to realtime events.
 * Used in ChatPanel and order tracking components.
 *
 * Falls back gracefully if NEXT_PUBLIC_PUSHER_KEY is not set.
 */
'use client'

import PusherClient from 'pusher-js'

let pusherClientInstance: PusherClient | null = null

export function getPusherClient(): PusherClient | null {
  if (typeof window === 'undefined') return null

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY
  if (!key) {
    // Pusher not configured — fallback to polling
    return null
  }

  if (!pusherClientInstance) {
    pusherClientInstance = new PusherClient(key, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap1',
    })
  }

  return pusherClientInstance
}

/** Cleanup: disconnect Pusher client */
export function disconnectPusherClient() {
  if (pusherClientInstance) {
    pusherClientInstance.disconnect()
    pusherClientInstance = null
  }
}
