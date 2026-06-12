'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { csrfFetch } from '@/lib/csrf-fetch'
import { io, Socket } from 'socket.io-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Send,
  ImagePlus,
  Search,
  MessageCircle,
  Plus,
  ArrowLeft,
  Loader2,
  X,
  Paperclip,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatPanelProps {
  userId: string
  userName: string
  initialTargetUserId?: string | null
  onClearInitialTargetUserId?: () => void
}

interface ConversationUser {
  id: string
  name: string
  avatar?: string | null
  role: string
}

interface Conversation {
  id: string
  type: string
  name?: string | null
  createdAt: string
  updatedAt: string
  otherUser: ConversationUser | null
  lastMessage: {
    id: string
    content: string
    type: string
    imageUrl?: string | null
    senderId: string
    createdAt: string
  } | null
  unreadCount: number
}

interface ChatMessage {
  id: string
  content: string
  type: string
  imageUrl?: string | null
  conversationId: string
  senderId: string
  isRead: boolean
  createdAt: string
  sender?: {
    id: string
    name: string
    avatar?: string | null
  }
}

interface SearchResult {
  id: string
  name: string
  email: string
  avatar?: string | null
  role: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const POLLING_INTERVAL = 3000 // 3 seconds
const SOCKET_TIMEOUT = 5000 // 5 seconds before falling back to polling

// ─── Helper: format time ──────────────────────────────────────────────────────

function formatChatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Vừa xong'
  if (diffMins < 60) return `${diffMins} phút`
  if (diffHours < 24) return `${diffHours} giờ`
  if (diffDays < 7) return `${diffDays} ngày`
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}

function getAvatarEmoji(role: string): string {
  const map: Record<string, string> = {
    BUYER: '🛍️',
    SELLER: '🏪',
    SHIPPER: '🏍️',
    ADMIN: '👑',
  }
  return map[role] || '👤'
}

function getRoleLabel(role: string): string {
  const map: Record<string, string> = {
    BUYER: 'Người mua',
    SELLER: 'Tiểu thương',
    SHIPPER: 'Shipper',
    ADMIN: 'Quản trị',
  }
  return map[role] || role
}

// ─── ChatPanel Component ─────────────────────────────────────────────────────

export default function ChatPanel({
  userId,
  userName,
  initialTargetUserId,
  onClearInitialTargetUserId,
}: ChatPanelProps) {
  // ── State ─────────────────────────────────────────────────────────────────
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [pollingMode, setPollingMode] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoadingConvs, setIsLoadingConvs] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map())
  const [showMobileMessages, setShowMobileMessages] = useState(false)
  const [newChatOpen, setNewChatOpen] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // ── Refs ──────────────────────────────────────────────────────────────────
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messageInputRef = useRef<HTMLInputElement>(null)
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const convPollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const socketTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastMessageIdRef = useRef<string>('') // track latest message for polling

  // ── Derived state ─────────────────────────────────────────────────────────
  const activeConversation = conversations.find((c) => c.id === activeConversationId)

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      conv.otherUser?.name.toLowerCase().includes(q) ||
      conv.name?.toLowerCase().includes(q) ||
      conv.lastMessage?.content.toLowerCase().includes(q)
    )
  })

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0)

  // ── Auto-scroll to bottom ─────────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }, [])

  // ── Start polling for messages ────────────────────────────────────────────
  const startMessagePolling = useCallback(() => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)

    pollingIntervalRef.current = setInterval(async () => {
      if (!activeConversationId) return
      try {
        const res = await fetch(`/api/chat/conversations/${activeConversationId}?limit=50`)
        if (res.ok) {
          const data = await res.json()
          const newMessages: ChatMessage[] = data.messages || []
          setMessages((prev) => {
            // Only update if there are new messages
            if (newMessages.length > prev.length) {
              // Check if the last message is new
              const lastNew = newMessages[newMessages.length - 1]
              if (lastNew && lastNew.id !== lastMessageIdRef.current) {
                lastMessageIdRef.current = lastNew.id
                scrollToBottom()
                return newMessages
              }
            }
            // Check for any new messages by comparing IDs
            const prevIds = new Set(prev.map(m => m.id))
            const hasNew = newMessages.some(m => !prevIds.has(m.id))
            if (hasNew) {
              lastMessageIdRef.current = newMessages[newMessages.length - 1]?.id || ''
              scrollToBottom()
              return newMessages
            }
            return prev
          })
        }
      } catch (err) {
        console.error('[Chat] Polling error:', err)
      }
    }, POLLING_INTERVAL)
  }, [activeConversationId, scrollToBottom])

  // ── Start polling for conversations ───────────────────────────────────────
  const startConvPolling = useCallback(() => {
    if (convPollingRef.current) clearInterval(convPollingRef.current)

    convPollingRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/chat/conversations')
        if (res.ok) {
          const data = await res.json()
          setConversations(data.conversations || [])
        }
      } catch (err) {
        console.error('[Chat] Conv polling error:', err)
      }
    }, POLLING_INTERVAL * 2) // Less frequent for conversation list
  }, [])

  // ── Stop all polling ──────────────────────────────────────────────────────
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    if (convPollingRef.current) {
      clearInterval(convPollingRef.current)
      convPollingRef.current = null
    }
  }, [])

  // ── Switch to polling mode ────────────────────────────────────────────────
  const enablePollingMode = useCallback(() => {
    console.log('[Chat] Switching to HTTP polling mode (Socket.io unavailable)')
    setPollingMode(true)
    startConvPolling()
    if (activeConversationId) {
      startMessagePolling()
    }
  }, [startConvPolling, startMessagePolling, activeConversationId])

  // ── Socket.io connection ──────────────────────────────────────────────────
  useEffect(() => {
    let newSocket: Socket | null = null

    try {
      newSocket = io('/?XTransformPort=3003', {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: SOCKET_TIMEOUT,
        withCredentials: true,
      })
    } catch (err) {
      console.error('[Chat] Failed to initialize Socket.io:', err)
      enablePollingMode()
      return
    }

    // Set a timeout: if not connected within SOCKET_TIMEOUT, fall back to polling
    socketTimeoutRef.current = setTimeout(() => {
      if (!newSocket?.connected) {
        console.log('[Chat] Socket.io connection timeout, switching to polling mode')
        newSocket.disconnect()
        enablePollingMode()
      }
    }, SOCKET_TIMEOUT)

    newSocket.on('connect', () => {
      console.log('[Chat] Connected to socket server')
      setIsConnected(true)
      setPollingMode(false)
      // Clear the timeout since we connected
      if (socketTimeoutRef.current) {
        clearTimeout(socketTimeoutRef.current)
        socketTimeoutRef.current = null
      }
      // Stop any polling since we have real-time connection
      stopPolling()
      // Authentication is handled via signed cookies on the server side
      // No need to send authenticate event
    })

    newSocket.on('disconnect', () => {
      console.log('[Chat] Disconnected from socket server')
      setIsConnected(false)
      // Don't immediately switch to polling on disconnect, let reconnection handle it
    })

    newSocket.on('connect_error', (err) => {
      console.warn('[Chat] Socket.io connection error:', err.message)
      // If we're not in polling mode yet and this is a persistent failure, switch
      if (!pollingMode) {
        enablePollingMode()
      }
    })

    // Handle new message from socket
    newSocket.on('new-message', (msg: ChatMessage) => {
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })

      // Update conversation list's last message and unread count
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id === msg.conversationId) {
            const isMine = msg.senderId === userId
            return {
              ...conv,
              lastMessage: {
                id: msg.id,
                content: msg.content,
                type: msg.type,
                imageUrl: msg.imageUrl,
                senderId: msg.senderId,
                createdAt: msg.createdAt,
              },
              unreadCount: isMine || conv.id === activeConversationId
                ? conv.unreadCount
                : conv.unreadCount + 1,
              updatedAt: msg.createdAt,
            }
          }
          return conv
        })
      )

      // Show toast for messages not in active conversation
      if (msg.conversationId !== activeConversationId && msg.senderId !== userId) {
        const conv = conversations.find((c) => c.id === msg.conversationId)
        if (conv?.otherUser) {
          toast.info(`💬 ${conv.otherUser.name}: ${msg.type === 'IMAGE' ? '📷 Hình ảnh' : msg.content.slice(0, 50)}`)
        }
      }

      // Auto-scroll if in active conversation
      if (msg.conversationId === activeConversationId) {
        scrollToBottom()
      }
    })

    // Handle typing indicator
    newSocket.on('user-typing', (data: { conversationId: string; userId: string; isTyping: boolean }) => {
      setTypingUsers((prev) => {
        const next = new Map(prev)
        if (data.isTyping) {
          next.set(data.conversationId, data.userId)
        } else {
          next.delete(data.conversationId)
        }
        return next
      })

      // Clear typing after 3 seconds
      if (data.isTyping) {
        const existing = typingTimeoutRef.current.get(data.conversationId)
        if (existing) clearTimeout(existing)
        typingTimeoutRef.current.set(
          data.conversationId,
          setTimeout(() => {
            setTypingUsers((prev) => {
              const next = new Map(prev)
              next.delete(data.conversationId)
              return next
            })
          }, 3000)
        )
      }
    })

    // Handle messages read
    newSocket.on('messages-read', (data: { conversationId: string; userId: string }) => {
      // Update messages as read
      setMessages((prev) =>
        prev.map((m) =>
          m.conversationId === data.conversationId && m.senderId !== data.userId
            ? { ...m, isRead: true }
            : m
        )
      )
    })

    // Handle unread count update
    newSocket.on('unread-count', () => {
      // Refresh conversations to get updated unread counts
      fetchConversations()
    })

    // Handle errors
    newSocket.on('error', (data: { message: string }) => {
      console.error('[Chat] Socket error:', data.message)
      toast.error(data.message)
    })

    setSocket(newSocket)

    return () => {
      newSocket?.disconnect()
      // Clean up timeouts
      typingTimeoutRef.current.forEach((timeout) => clearTimeout(timeout))
      if (socketTimeoutRef.current) {
        clearTimeout(socketTimeoutRef.current)
      }
      stopPolling()
    }
  }, [userId])

  // ── Manage polling when active conversation changes ───────────────────────
  useEffect(() => {
    if (pollingMode && activeConversationId) {
      startMessagePolling()
    }
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [pollingMode, activeConversationId, startMessagePolling])

  // ── Fetch conversations ───────────────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/conversations')
      if (res.ok) {
        const data = await res.json()
        setConversations(data.conversations || [])
      }
    } catch (err) {
      console.error('Error fetching conversations:', err)
    } finally {
      setIsLoadingConvs(false)
    }
  }, [])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // ── Fetch messages when active conversation changes ───────────────────────
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([])
      return
    }

    const fetchMessages = async () => {
      setIsLoadingMessages(true)
      try {
        const res = await fetch(`/api/chat/conversations/${activeConversationId}`)
        if (res.ok) {
          const data = await res.json()
          setMessages(data.messages || [])
          lastMessageIdRef.current = data.messages?.[data.messages.length - 1]?.id || ''
          scrollToBottom()
        }
      } catch (err) {
        console.error('Error fetching messages:', err)
      } finally {
        setIsLoadingMessages(false)
      }
    }

    fetchMessages()

    // Mark as read when opening a conversation
    if (socket && isConnected && !pollingMode) {
      socket.emit('mark-read', { conversationId: activeConversationId })
      // Update local unread count
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === activeConversationId ? { ...conv, unreadCount: 0 } : conv
        )
      )
    } else if (pollingMode) {
      // In polling mode, just clear unread locally
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === activeConversationId ? { ...conv, unreadCount: 0 } : conv
        )
      )
    }
  }, [activeConversationId, socket, isConnected, userId, scrollToBottom])

  // ── Send message (supports both Socket.io and HTTP API) ───────────────────
  const sendMessage = useCallback(
    async (content: string, type: 'TEXT' | 'IMAGE' = 'TEXT', imageUrl?: string) => {
      if (!activeConversationId || !content.trim()) return

      setIsSending(true)
      try {
        if (socket && isConnected && !pollingMode) {
          // Use Socket.io for real-time delivery
          socket.emit('send-message', {
            conversationId: activeConversationId,
            content: content.trim(),
            type,
            imageUrl: imageUrl || null,
          })
        } else {
          // Use HTTP API as fallback (for polling mode / Vercel)
          const res = await csrfFetch('/api/chat/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conversationId: activeConversationId,
              content: content.trim(),
              type,
              imageUrl: imageUrl || undefined,
            }),
          })
          if (!res.ok) {
            const data = await res.json()
            toast.error(data.error || 'Không thể gửi tin nhắn')
            return
          }
          // Refresh messages to show the sent message
          const msgRes = await fetch(`/api/chat/conversations/${activeConversationId}?limit=50`)
          if (msgRes.ok) {
            const data = await msgRes.json()
            setMessages(data.messages || [])
            lastMessageIdRef.current = data.messages?.[data.messages.length - 1]?.id || ''
            scrollToBottom()
          }
          // Refresh conversation list to update last message
          fetchConversations()
        }
        setNewMessage('')
        // Clear typing
        if (socket && isConnected && !pollingMode) {
          socket.emit('typing', {
            conversationId: activeConversationId,
            isTyping: false,
          })
        }
      } catch (err) {
        console.error('Error sending message:', err)
        toast.error('Không thể gửi tin nhắn')
      } finally {
        setIsSending(false)
      }
    },
    [socket, isConnected, pollingMode, activeConversationId, userId, scrollToBottom, fetchConversations]
  )

  // ── Handle text input change with typing indicator ────────────────────────
  const handleInputChange = useCallback(
    (value: string) => {
      setNewMessage(value)
      if (socket && isConnected && !pollingMode && activeConversationId) {
        socket.emit('typing', {
          conversationId: activeConversationId,
          isTyping: value.length > 0,
        })
      }
    },
    [socket, isConnected, pollingMode, activeConversationId]
  )

  // ── Handle send on Enter ──────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (newMessage.trim()) {
          sendMessage(newMessage)
        }
      }
    },
    [newMessage, sendMessage]
  )

  // ── Image upload ──────────────────────────────────────────────────────────
  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      setIsUploading(true)
      try {
        const formData = new FormData()
        formData.append('image', file)

        const res = await csrfFetch('/api/chat/upload', {
          method: 'POST',
          body: formData,
        })

        if (res.ok) {
          const data = await res.json()
          sendMessage(data.imageUrl, 'IMAGE', data.imageUrl)
        } else {
          const data = await res.json()
          toast.error(data.error || 'Không thể tải ảnh lên')
        }
      } catch (err) {
        console.error('Error uploading image:', err)
        toast.error('Không thể tải ảnh lên')
      } finally {
        setIsUploading(false)
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    },
    [sendMessage]
  )

  // ── Search users for new conversation ─────────────────────────────────────
  const searchUsers = useCallback(async (query: string) => {
    setUserSearch(query)
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const res = await fetch(`/api/chat/users?search=${encodeURIComponent(query)}`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data.users || [])
      }
    } catch (err) {
      console.error('Error searching users:', err)
    } finally {
      setIsSearching(false)
    }
  }, [])

  // ── Start new conversation ────────────────────────────────────────────────
  const startConversation = useCallback(
    async (targetUserId: string) => {
      try {
        const res = await csrfFetch('/api/chat/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetUserId }),
        })

        if (res.ok) {
          const data = await res.json()
          const conv = data.conversation

          // If new conversation, add to list
          if (!data.existing) {
            setConversations((prev) => [conv, ...prev])
          } else {
            // Update existing or add if not present
            setConversations((prev) => {
              const exists = prev.some((c) => c.id === conv.id)
              if (!exists) return [conv, ...prev]
              return prev.map((c) => (c.id === conv.id ? conv : c))
            })
          }

          setActiveConversationId(conv.id)
          setShowMobileMessages(true)
          setNewChatOpen(false)
          setUserSearch('')
          setSearchResults([])
        } else {
          const data = await res.json()
          toast.error(data.error || 'Không thể tạo hội thoại')
        }
      } catch (err) {
        console.error('Error creating conversation:', err)
        toast.error('Không thể tạo hội thoại')
      }
    },
    []
  )

  useEffect(() => {
    if (initialTargetUserId) {
      startConversation(initialTargetUserId)
      onClearInitialTargetUserId?.()
    }
  }, [initialTargetUserId, startConversation, onClearInitialTargetUserId])

  // ── Select conversation ───────────────────────────────────────────────────
  const selectConversation = useCallback((convId: string) => {
    setActiveConversationId(convId)
    setShowMobileMessages(true)
  }, [])

  // ── Back to conversation list (mobile) ────────────────────────────────────
  const backToList = useCallback(() => {
    setShowMobileMessages(false)
  }, [])

  // ── Connection status component ───────────────────────────────────────────
  const ConnectionStatus = () => (
    <div className="flex items-center gap-1.5">
      {pollingMode ? (
        <>
          <RefreshCw className="h-3 w-3 text-amber-500" />
          <span className="text-xs text-amber-600">Tự động cập nhật</span>
        </>
      ) : isConnected ? (
        <>
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-xs text-green-600">Trực tuyến</span>
        </>
      ) : (
        <>
          <span className="h-2 w-2 rounded-full bg-red-400" />
          <span className="text-xs text-muted-foreground">Đang kết nối...</span>
        </>
      )}
    </div>
  )

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-180px)] min-h-[400px] rounded-xl border bg-white shadow-sm overflow-hidden">
      {/* ── LEFT SIDEBAR: Conversation List ────────────────────────────────── */}
      <div
        className={`w-full md:w-80 lg:w-96 border-r flex flex-col bg-muted/20 ${
          showMobileMessages ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-sm">Tin nhắn</h3>
              {totalUnread > 0 && (
                <Badge className="bg-green-600 text-white text-xs px-1.5 py-0 h-5 min-w-[20px] flex items-center justify-center">
                  {totalUnread}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <ConnectionStatus />
              {/* New chat button */}
              <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Tin nhắn mới</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Tìm người dùng..."
                        className="pl-9"
                        value={userSearch}
                        onChange={(e) => searchUsers(e.target.value)}
                      />
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-1">
                      {isSearching && (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      {!isSearching && userSearch && searchResults.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Không tìm thấy người dùng
                        </p>
                      )}
                      {searchResults.map((user) => (
                        <button
                          key={user.id}
                          className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors text-left"
                          onClick={() => startConversation(user.id)}
                        >
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-green-100 text-green-700 text-sm">
                              {user.avatar || getAvatarEmoji(user.role)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {getRoleLabel(user.role)} • {user.email}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                    {/* Quick userId input for testing */}
                    <div className="border-t pt-3">
                      <p className="text-xs text-muted-foreground mb-2">
                        Hoặc nhập User ID:
                      </p>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Nhập userId..."
                          className="text-xs"
                          id="direct-userid-input"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const val = (e.target as HTMLInputElement).value.trim()
                              if (val) startConversation(val)
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const input = document.getElementById('direct-userid-input') as HTMLInputElement
                            if (input?.value.trim()) startConversation(input.value.trim())
                          }}
                        >
                          Chat
                        </Button>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm tin nhắn..."
              className="pl-9 h-9 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingConvs ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <MessageCircle className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'Không tìm thấy tin nhắn' : 'Chưa có tin nhắn nào'}
              </p>
              {!searchQuery && (
                <p className="text-xs text-muted-foreground mt-1">
                  Nhấn + để bắt đầu trò chuyện
                </p>
              )}
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.id}
                className={`w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left ${
                  activeConversationId === conv.id ? 'bg-green-50 border-l-2 border-l-green-600' : ''
                }`}
                onClick={() => selectConversation(conv.id)}
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="bg-green-100 text-green-700">
                    {conv.otherUser?.avatar || getAvatarEmoji(conv.otherUser?.role || '')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">
                      {conv.otherUser?.name || conv.name || 'Hội thoại'}
                    </p>
                    {conv.lastMessage && (
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">
                        {formatChatTime(conv.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-muted-foreground truncate flex-1">
                      {conv.lastMessage
                        ? conv.lastMessage.type === 'IMAGE'
                          ? '📷 Hình ảnh'
                          : conv.lastMessage.content
                        : 'Chưa có tin nhắn'}
                    </p>
                    {conv.unreadCount > 0 && (
                      <Badge className="bg-green-600 text-white text-[10px] px-1.5 py-0 h-4 min-w-[18px] flex items-center justify-center ml-2 shrink-0">
                        {conv.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL: Message Area ──────────────────────────────────────── */}
      <div
        className={`flex-1 flex flex-col ${
          showMobileMessages ? 'flex' : 'hidden md:flex'
        }`}
      >
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="px-4 py-3 border-b flex items-center gap-3 bg-white">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 md:hidden"
                onClick={backToList}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-green-100 text-green-700 text-sm">
                  {activeConversation.otherUser?.avatar ||
                    getAvatarEmoji(activeConversation.otherUser?.role || '')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">
                  {activeConversation.otherUser?.name || activeConversation.name || 'Hội thoại'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {typingUsers.has(activeConversation.id) ? (
                    <span className="text-green-600 animate-pulse">Đang nhập...</span>
                  ) : (
                    getRoleLabel(activeConversation.otherUser?.role || '')
                  )}
                </p>
              </div>
              {/* Polling mode indicator in chat header */}
              {pollingMode && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 border border-amber-200">
                  <RefreshCw className="h-3 w-3 text-amber-500" />
                  <span className="text-[10px] text-amber-600 hidden sm:inline">Tự động</span>
                </div>
              )}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10">
              {isLoadingMessages ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}
                    >
                      <Skeleton
                        className={`h-10 ${i % 2 === 0 ? 'w-48' : 'w-36'} rounded-xl`}
                      />
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageCircle className="h-16 w-16 text-muted-foreground/20 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Bắt đầu cuộc trò chuyện
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Gửi tin nhắn đầu tiên nhé!
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderId === userId
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex items-end gap-2 max-w-[75%] ${isMine ? 'flex-row-reverse' : ''}`}>
                        {/* Avatar for other user */}
                        {!isMine && (
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarFallback className="bg-gray-100 text-gray-600 text-xs">
                              {msg.sender?.avatar || getAvatarEmoji(activeConversation.otherUser?.role || '')}
                            </AvatarFallback>
                          </Avatar>
                        )}

                        <div
                          className={`rounded-2xl px-3.5 py-2 ${
                            isMine
                              ? 'bg-green-600 text-white rounded-br-md'
                              : 'bg-gray-100 text-gray-900 rounded-bl-md'
                          }`}
                        >
                          {/* Sender name (for group chats) */}
                          {!isMine && msg.sender && (
                            <p className="text-xs font-medium text-green-700 mb-0.5">
                              {msg.sender.name}
                            </p>
                          )}

                          {/* Message content */}
                          {msg.type === 'IMAGE' && msg.imageUrl ? (
                            <div className="space-y-1">
                              <img
                                src={msg.imageUrl}
                                alt="Hình ảnh"
                                className="max-w-full rounded-lg max-h-60 object-cover cursor-pointer"
                                onClick={() => msg.imageUrl && window.open(msg.imageUrl, '_blank')}
                              />
                              {msg.content && msg.content !== msg.imageUrl && (
                                <p className="text-sm">{msg.content}</p>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                          )}

                          {/* Timestamp */}
                          <p
                            className={`text-[10px] mt-1 ${
                              isMine ? 'text-green-100' : 'text-muted-foreground'
                            } text-right`}
                          >
                            {formatChatTime(msg.createdAt)}
                            {isMine && msg.isRead && ' ✓✓'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}

              {/* Typing indicator (only shown in socket mode) */}
              {!pollingMode && typingUsers.has(activeConversation.id) && (
                <div className="flex justify-start items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-gray-100 text-gray-600 text-xs">
                      {activeConversation.otherUser?.avatar || '👤'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-2.5">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-3 border-t bg-white">
              <div className="flex items-center gap-2">
                {/* Image upload button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-muted-foreground hover:text-green-600"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />

                {/* Text input */}
                <Input
                  ref={messageInputRef}
                  placeholder={pollingMode ? "Nhập tin nhắn... (tự động cập nhật)" : "Nhập tin nhắn..."}
                  className="flex-1 h-9 text-sm"
                  value={newMessage}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isSending}
                />

                {/* Send button */}
                <Button
                  size="icon"
                  className="h-9 w-9 shrink-0 bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    if (newMessage.trim()) sendMessage(newMessage)
                  }}
                  disabled={!newMessage.trim() || isSending}
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* No conversation selected */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <div className="h-20 w-20 rounded-full bg-green-50 flex items-center justify-center mb-4">
              <MessageCircle className="h-10 w-10 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700">ZMarket Chat</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              Chọn một hội thoại hoặc bắt đầu trò chuyện mới
            </p>
            <div className="flex items-center gap-2 mt-4">
              <ConnectionStatus />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
