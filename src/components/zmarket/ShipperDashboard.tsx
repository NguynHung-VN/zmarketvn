'use client'

import { useState, useEffect } from 'react'
import { csrfFetch } from '@/lib/csrf-fetch'
import { useAppStore } from '@/lib/store'
import { formatPrice, getStatusLabel, getStatusColor, formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  ClipboardList, History, User, Bike, MapPin, Phone,
  CheckCircle, Loader2, Package, MessageCircle, MessageSquareWarning
} from 'lucide-react'
import ChatPanel from './ChatPanel'
import FeedbackPanel from './FeedbackPanel'

interface DeliveryItem {
  id: string
  quantity: number
  price: number
  product: { id: string; name: string; image?: string | null; unit: string }
}

interface Delivery {
  id: string
  status: string
  total: number
  shippingFee: number
  address: string
  phone: string
  note?: string | null
  paymentMethod: string
  paymentStatus: string
  createdAt: string
  buyer: { id: string; name: string; phone: string; address?: string | null }
  shop: { id: string; name: string; address: string; phone?: string | null }
  items: DeliveryItem[]
}

const shipperTabs = [
  { id: 'deliveries', label: 'Đơn giao', icon: Bike },
  { id: 'history', label: 'Lịch sử', icon: History },
  { id: 'chat', label: 'Nhắn tin', icon: MessageCircle },
  { id: 'feedback', label: 'Phản hồi', icon: MessageSquareWarning },
  { id: 'profile', label: 'Hồ sơ', icon: User },
]

export default function ShipperDashboard() {
  const { user, currentTab, setTab } = useAppStore()
  const activeTab = currentTab || 'deliveries'

  const handleTabChange = (tab: string) => {
    setTab(tab)
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      {/* Header - sticky with backdrop blur */}
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black text-green-700">Z-MARKET</h1>
            <Badge variant="secondary" className="bg-sky-100 text-sky-700">Shipper</Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={() => useAppStore.getState().logout()}>
              Đăng xuất
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        <aside className="hidden md:flex w-56 bg-white border-r flex-col">
          <nav className="p-3 space-y-1">
            {shipperTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-sky-50 text-sky-700'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile Tab Bar */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t z-50 safe-area-pb">
          <div className="flex justify-around">
            {shipperTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex flex-col items-center py-2 px-3 text-xs relative transition-colors ${
                  activeTab === tab.id ? 'text-sky-700' : 'text-muted-foreground'
                }`}
              >
                {activeTab === tab.id && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-sky-600 rounded-full" />
                )}
                <tab.icon className={`h-5 w-5 transition-transform ${activeTab === tab.id ? 'scale-110' : ''}`} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <main className="flex-1 p-4 sm:p-6 pb-20 md:pb-6">
          <div className="animate-fadeIn">
            {activeTab === 'deliveries' && <DeliveriesTab />}
            {activeTab === 'history' && <HistoryTab />}
            {activeTab === 'chat' && user && <ChatPanel userId={user.id} userName={user.name} />}
            {activeTab === 'feedback' && user && <FeedbackPanel userId={user.id} userRole={user.role} />}
            {activeTab === 'profile' && <ProfileTab />}
          </div>
        </main>
      </div>

      <footer className="bg-gray-900 text-gray-400 mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-4 text-center text-sm">
          © 2024 Z-Market — Chợ Số Việt Nam
        </div>
      </footer>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

// ==================== DELIVERIES TAB ====================
function DeliveriesTab() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    const fetchDeliveries = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/shipper/deliveries?status=SHIPPING')
        if (res.ok && !cancelled) {
          const data = await res.json()
          setDeliveries(data.deliveries || [])
        }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false)
    }
    fetchDeliveries()
    return () => { cancelled = true }
  }, [refreshKey])

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      const res = await csrfFetch(`/api/shipper/deliveries/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(status === 'DELIVERED' ? 'Đã giao hàng thành công 🎉' : 'Đã nhận đơn giao')
      setRefreshKey(k => k + 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Lỗi')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-32 w-full" /></CardContent></Card>
        ))}
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Đơn giao hàng</h2>
      {deliveries.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🏍️</div>
          <h3 className="text-lg font-semibold">Không có đơn giao nào</h3>
          <p className="text-muted-foreground">Đơn giao hàng sẽ xuất hiện khi có sẵn</p>
        </div>
      ) : (
        <div className="space-y-4">
          {deliveries.map((delivery) => (
            <Card key={delivery.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-sm">Đơn #{delivery.id.slice(-8)}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(delivery.createdAt)}</p>
                  </div>
                  <Badge className={`${getStatusColor(delivery.status)} text-xs`}>
                    {getStatusLabel(delivery.status)}
                  </Badge>
                </div>

                {/* Shop info */}
                <div className="bg-amber-50 rounded-lg p-3 mb-3">
                  <p className="text-sm font-medium">🏪 {delivery.shop.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {delivery.shop.address}
                  </p>
                  {delivery.shop.phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {delivery.shop.phone}
                    </p>
                  )}
                </div>

                {/* Buyer info */}
                <div className="bg-blue-50 rounded-lg p-3 mb-3">
                  <p className="text-sm font-medium">👤 {delivery.buyer.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {delivery.address}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {delivery.phone}
                  </p>
                </div>

                {/* Items */}
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground mb-1">Sản phẩm:</p>
                  {delivery.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>{item.product.name} x{item.quantity}</span>
                      <span>{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-green-700">
                    {formatPrice(delivery.total + delivery.shippingFee)}
                  </span>
                  {delivery.status === 'SHIPPING' && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleUpdateStatus(delivery.id, 'DELIVERED')}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Đã giao hàng
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== HISTORY TAB ====================
function HistoryTab() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const fetchHistory = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/shipper/deliveries')
        if (res.ok && !cancelled) {
          const data = await res.json()
          setDeliveries(data.deliveries || [])
        }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false)
    }
    fetchHistory()
    return () => { cancelled = true }
  }, [])

  const totalEarnings = deliveries.filter(d => d.status === 'DELIVERED').reduce((sum, d) => sum + d.shippingFee, 0)

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Lịch sử giao hàng</h2>
        <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
          <span className="text-sm">Thu nhập: <strong className="text-green-700">{formatPrice(totalEarnings)}</strong></span>
        </div>
      </div>

      {deliveries.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📋</div>
          <h3 className="text-lg font-semibold">Chưa có lịch sử giao hàng</h3>
          <p className="text-muted-foreground">Lịch sử sẽ được cập nhật khi bạn hoàn thành giao hàng</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deliveries.map((delivery) => (
            <Card key={delivery.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">Đơn #{delivery.id.slice(-8)}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(delivery.createdAt)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {delivery.shop.name} → {delivery.buyer.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge className={`${getStatusColor(delivery.status)} text-xs`}>
                      {getStatusLabel(delivery.status)}
                    </Badge>
                    <p className="text-sm font-medium mt-1">{formatPrice(delivery.shippingFee)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== PROFILE TAB ====================
function ProfileTab() {
  const { user } = useAppStore()
  if (!user) return null

  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-bold mb-4">Hồ sơ cá nhân</h2>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-sky-100 flex items-center justify-center text-2xl font-bold text-sky-700">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-semibold">{user.name}</h3>
              <Badge className="bg-sky-100 text-sky-700">🏍️ Shipper</Badge>
            </div>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Email</p>
                <p className="text-sm font-medium">{user.email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Số điện thoại</p>
                <p className="text-sm font-medium">{user.phone || 'Chưa cập nhật'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Địa chỉ</p>
                <p className="text-sm font-medium">{user.address || 'Chưa cập nhật'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Ngày tham gia</p>
                <p className="text-sm font-medium">{formatDateTime(user.createdAt)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
