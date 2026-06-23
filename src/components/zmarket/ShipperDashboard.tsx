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
  CheckCircle, Loader2, Package, MessageCircle, MessageSquareWarning, Settings
} from 'lucide-react'
import ChatPanel from './ChatPanel'
import FeedbackPanel from './FeedbackPanel'
import ProfileTab from './ProfileTab'
import SettingsTab from './SettingsTab'
import UserHeaderMenu from './UserHeaderMenu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import dynamic from 'next/dynamic'
import { translations } from '@/lib/translations'

const ShipperMapModal = dynamic(
  () => import('./ShipperMapModal'),
  { ssr: false }
)

const getMockCoordinates = (id: string): { shop: [number, number]; buyer: [number, number] } => {
  const centerLat = 10.776
  const centerLng = 106.701
  
  let offset1 = 0
  let offset2 = 0
  for (let i = 0; i < id.length; i++) {
    offset1 += id.charCodeAt(i) * (i + 1)
    offset2 += id.charCodeAt(i) * (i + 2)
  }
  
  const latOffsetShop = ((offset1 % 50) - 25) / 1000
  const lngOffsetShop = ((offset2 % 50) - 25) / 1000
  
  const latOffsetBuyer = (((offset2 + 13) % 50) - 25) / 1000
  const lngOffsetBuyer = (((offset1 + 17) % 50) - 25) / 1000

  return {
    shop: [centerLat + latOffsetShop, centerLng + lngOffsetShop],
    buyer: [centerLat + latOffsetBuyer, centerLng + lngOffsetBuyer],
  }
}

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
  const { user, currentTab, setTab, language, setLanguage } = useAppStore()
  const activeTab = currentTab || 'deliveries'
  const t = translations[language]

  const handleTabChange = (tab: string) => {
    setTab(tab)
  }

  const shipperTabs = [
    { id: 'deliveries', label: language === 'vi' ? 'Đơn giao' : 'Deliveries', icon: Bike },
    { id: 'history', label: language === 'vi' ? 'Lịch sử' : 'History', icon: History },
    { id: 'chat', label: t.chat, icon: MessageCircle },
    { id: 'feedback', label: t.feedback, icon: MessageSquareWarning },
    { id: 'settings', label: t.settings, icon: Settings },
    { id: 'profile', label: t.profile, icon: User },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      {/* Header - sticky with backdrop blur */}
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black text-green-700">Z-MARKET</h1>
            <Badge variant="secondary" className="bg-sky-100 text-sky-700">{t.role_shipper}</Badge>
          </div>
          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <div className="flex items-center gap-1 bg-muted rounded-full p-0.5 border">
              <button
                onClick={() => setLanguage('vi')}
                className={`px-2 py-0.5 rounded-full text-xs font-bold transition-all ${
                  language === 'vi' ? 'bg-white text-green-800 shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                VI
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-0.5 rounded-full text-xs font-bold transition-all ${
                  language === 'en' ? 'bg-white text-green-800 shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                EN
              </button>
            </div>

            <UserHeaderMenu />
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
            {activeTab === 'settings' && <SettingsTab />}
            {activeTab === 'profile' && <ProfileTab />}
          </div>
        </main>
      </div>

      <footer className="bg-gray-900 text-gray-400 mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-4 text-center text-sm">
          © Z-Market — Chợ Số Việt Nam
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
  const [activeMapDelivery, setActiveMapDelivery] = useState<Delivery | null>(null)
  
  const { language } = useAppStore()
  const t = translations[language]

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
      toast.success(status === 'DELIVERED' ? t.shipper_delivered_success : 'Đã nhận đơn giao')
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
      <h2 className="text-xl font-bold mb-4">{t.shipper_title}</h2>
      {deliveries.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-muted/50">
          <div className="text-5xl mb-4">🏍️</div>
          <h3 className="text-lg font-semibold">{language === 'vi' ? 'Không có đơn giao nào' : 'No active deliveries'}</h3>
          <p className="text-muted-foreground">{language === 'vi' ? 'Đơn giao hàng sẽ xuất hiện khi có sẵn' : 'New delivery orders will appear here when available'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {deliveries.map((delivery) => (
            <Card key={delivery.id} className="hover:shadow-md transition-shadow border-0 shadow-sm rounded-2xl overflow-hidden bg-white/90">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-bold text-sm text-foreground/80">{language === 'vi' ? 'Đơn' : 'Order'} #{delivery.id.slice(-8)}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(delivery.createdAt)}</p>
                  </div>
                  <Badge className={`${getStatusColor(delivery.status)} text-xs font-semibold px-2.5 py-1 rounded-full`}>
                    {getStatusLabel(delivery.status)}
                  </Badge>
                </div>

                {/* Shop info */}
                <div className="bg-amber-50/50 rounded-xl p-3.5 mb-3.5 border border-amber-100/30">
                  <p className="text-sm font-bold text-amber-900">{t.shipper_shop}: {delivery.shop.name}</p>
                  <p className="text-xs text-amber-800 flex items-center gap-1.5 mt-1">
                    <MapPin className="h-3.5 w-3.5 shrink-0" /> {delivery.shop.address}
                  </p>
                  {delivery.shop.phone && (
                    <p className="text-xs text-amber-800 flex items-center gap-1.5 mt-0.5">
                      <Phone className="h-3.5 w-3.5 shrink-0" /> {delivery.shop.phone}
                    </p>
                  )}
                </div>

                {/* Buyer info */}
                <div className="bg-blue-50/50 rounded-xl p-3.5 mb-3.5 border border-blue-100/30">
                  <p className="text-sm font-bold text-blue-900">{t.shipper_buyer}: {delivery.buyer.name}</p>
                  <p className="text-xs text-blue-800 flex items-center gap-1.5 mt-1">
                    <MapPin className="h-3.5 w-3.5 shrink-0" /> {delivery.address}
                  </p>
                  <p className="text-xs text-blue-800 flex items-center gap-1.5 mt-0.5">
                    <Phone className="h-3.5 w-3.5 shrink-0" /> {delivery.phone}
                  </p>
                </div>

                {/* Items */}
                <div className="mb-4 bg-muted/20 p-3 rounded-xl">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">{language === 'vi' ? 'Sản phẩm:' : 'Products:'}</p>
                  <div className="space-y-1">
                    {delivery.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm text-foreground/80">
                        <span>{item.product.name} x{item.quantity}</span>
                        <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  <span className="text-base font-bold text-green-700">
                    {formatPrice(delivery.total + delivery.shippingFee)}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-sky-200 text-sky-700 hover:bg-sky-50 font-semibold"
                      onClick={() => setActiveMapDelivery(delivery)}
                    >
                      <MapPin className="h-4 w-4 mr-1.5" />
                      {language === 'vi' ? 'Xem bản đồ' : 'View Map'}
                    </Button>
                    {delivery.status === 'SHIPPING' && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold"
                        onClick={() => handleUpdateStatus(delivery.id, 'DELIVERED')}
                      >
                        <CheckCircle className="h-4 w-4 mr-1.5" />
                        {language === 'vi' ? 'Đã giao hàng' : 'Delivered'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Interactive Map Dialog */}
      {activeMapDelivery && (
        <Dialog open={!!activeMapDelivery} onOpenChange={(val) => !val && setActiveMapDelivery(null)}>
          <DialogContent className="sm:max-w-xl bg-white/95 backdrop-blur-md rounded-2xl border-0 shadow-2xl p-6">
            <DialogHeader className="pb-3 border-b">
              <DialogTitle className="text-lg font-bold text-sky-800 flex items-center gap-2">
                🗺️ {language === 'vi' ? 'Bản đồ giao hàng' : 'Delivery Route Map'} #{activeMapDelivery.id.slice(-8)}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <ShipperMapModal 
                shopLocation={getMockCoordinates(activeMapDelivery.id).shop}
                buyerLocation={getMockCoordinates(activeMapDelivery.id).buyer}
                shopName={activeMapDelivery.shop.name}
                buyerName={activeMapDelivery.buyer.name}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// ==================== HISTORY TAB ====================
function HistoryTab() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [activeMapDelivery, setActiveMapDelivery] = useState<Delivery | null>(null)
  
  const { language } = useAppStore()
  const t = translations[language]

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
        <h2 className="text-xl font-bold">{t.shipper_history}</h2>
        <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
          <span className="text-sm">{language === 'vi' ? 'Thu nhập:' : 'Earnings:'} <strong className="text-green-700">{formatPrice(totalEarnings)}</strong></span>
        </div>
      </div>

      {deliveries.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-muted/50">
          <div className="text-5xl mb-4">📋</div>
          <h3 className="text-lg font-semibold">{language === 'vi' ? 'Chưa có lịch sử giao hàng' : 'No delivery history'}</h3>
          <p className="text-muted-foreground">{language === 'vi' ? 'Lịch sử sẽ được cập nhật khi bạn hoàn thành giao hàng' : 'History will be updated when you complete deliveries'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deliveries.map((delivery) => (
            <Card key={delivery.id} className="hover:shadow-md transition-shadow border-0 shadow-sm rounded-2xl overflow-hidden bg-white/90">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="font-bold text-sm text-foreground/80">{language === 'vi' ? 'Đơn' : 'Order'} #{delivery.id.slice(-8)}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(delivery.createdAt)}</p>
                    <p className="text-xs text-muted-foreground mt-2 font-medium truncate">
                      🏪 {delivery.shop.name} → 👤 {delivery.buyer.name}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge className={`${getStatusColor(delivery.status)} text-xs font-semibold px-2 py-0.5 rounded-full mb-1`}>
                      {getStatusLabel(delivery.status)}
                    </Badge>
                    <p className="text-sm font-bold text-foreground/80 mt-1">{formatPrice(delivery.shippingFee)}</p>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-xs text-sky-600 hover:text-sky-800 hover:bg-sky-50 font-semibold mt-2 h-7 px-2"
                      onClick={() => setActiveMapDelivery(delivery)}
                    >
                      <MapPin className="h-3 w-3 mr-1" />
                      {language === 'vi' ? 'Bản đồ' : 'Map'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Interactive Map Dialog */}
      {activeMapDelivery && (
        <Dialog open={!!activeMapDelivery} onOpenChange={(val) => !val && setActiveMapDelivery(null)}>
          <DialogContent className="sm:max-w-xl bg-white/95 backdrop-blur-md rounded-2xl border-0 shadow-2xl p-6">
            <DialogHeader className="pb-3 border-b">
              <DialogTitle className="text-lg font-bold text-sky-800 flex items-center gap-2">
                🗺️ {language === 'vi' ? 'Bản đồ giao hàng' : 'Delivery Route Map'} #{activeMapDelivery.id.slice(-8)}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <ShipperMapModal 
                shopLocation={getMockCoordinates(activeMapDelivery.id).shop}
                buyerLocation={getMockCoordinates(activeMapDelivery.id).buyer}
                shopName={activeMapDelivery.shop.name}
                buyerName={activeMapDelivery.buyer.name}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// Shared ProfileTab component imported from ./ProfileTab
