'use client'

import { useState, useEffect } from 'react'
import { csrfFetch } from '@/lib/csrf-fetch'
import { useAppStore } from '@/lib/store'
import { formatPrice, getStatusLabel, getStatusColor, getRoleLabel, getRoleColor, formatDateTime, getPaymentStatusLabel } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  LayoutDashboard, Users, Store, ClipboardList,
  Package, DollarSign, Loader2, Shield, TrendingUp,
  MessageCircle, MessageSquareWarning, User, Settings
} from 'lucide-react'
import ChatPanel from './ChatPanel'
import FeedbackPanel from './FeedbackPanel'
import ProfileTab from './ProfileTab'
import SettingsTab from './SettingsTab'
import UserHeaderMenu from './UserHeaderMenu'
import { translations } from '@/lib/translations'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface AdminStats {
  totalUsers: number
  totalShops: number
  totalOrders: number
  totalProducts: number
  totalRevenue: number
}

interface AdminUser {
  id: string
  email: string
  name: string
  phone?: string | null
  role: string
  isActive: boolean
  createdAt: string
  _count: { orders: number; cartItems?: number; reviews: number }
}

interface AdminShop {
  id: string
  name: string
  address: string
  rating: number
  isActive: boolean
  owner: { id: string; name: string }
  _count: { products: number }
}

interface AdminOrder {
  id: string
  status: string
  subtotal: number
  total: number
  shippingFee: number
  paymentMethod: string
  paymentStatus: string
  createdAt: string
  buyer: { id: string; name: string; phone: string }
  shop: { id: string; name: string }
  shipper?: { id: string; name: string; phone: string } | null
  items: { id: string; quantity: number; price: number; product: { id: string; name: string } }[]
}

const statusColors: Record<string, string> = {
  PENDING: '#eab308',
  CONFIRMED: '#3b82f6',
  PREPARING: '#a855f7',
  SHIPPING: '#f97316',
  DELIVERED: '#22c55e',
  CANCELLED: '#ef4444',
}

// adminTabs is now defined dynamically inside the AdminDashboard component using translation keys

export default function AdminDashboard() {
  const { user, currentTab, setTab, language, setLanguage } = useAppStore()
  const activeTab = currentTab || 'overview'
  const t = translations[language]

  const handleTabChange = (tab: string) => {
    setTab(tab)
  }

  const adminTabs = [
    { id: 'overview', label: language === 'vi' ? 'Tổng quan' : 'Overview', icon: LayoutDashboard },
    { id: 'users', label: language === 'vi' ? 'Người dùng' : 'Users', icon: Users },
    { id: 'shops', label: t.shops, icon: Store },
    { id: 'orders', label: t.orders, icon: ClipboardList },
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
            <Badge variant="secondary" className="bg-rose-100 text-rose-700">{t.role_admin}</Badge>
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
            {adminTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-rose-50 text-rose-700'
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
            {adminTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex flex-col items-center py-2 px-3 text-xs relative transition-colors ${
                  activeTab === tab.id ? 'text-rose-700' : 'text-muted-foreground'
                }`}
              >
                {activeTab === tab.id && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-rose-600 rounded-full" />
                )}
                <tab.icon className={`h-5 w-5 transition-transform ${activeTab === tab.id ? 'scale-110' : ''}`} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <main className="flex-1 p-4 sm:p-6 pb-20 md:pb-6">
          <div className="animate-fadeIn">
            {activeTab === 'overview' && <OverviewTab />}
            {activeTab === 'users' && <UsersTab />}
            {activeTab === 'shops' && <ShopsTab />}
            {activeTab === 'orders' && <OrdersTab />}
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

// ==================== OVERVIEW TAB ====================
function OverviewTab() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [ordersByStatus, setOrdersByStatus] = useState<Record<string, number>>({})
  const [usersByRole, setUsersByRole] = useState<Record<string, number>>({})
  const [recentOrders, setRecentOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const fetchStats = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/admin/stats')
        if (res.ok && !cancelled) {
          const data = await res.json()
          setStats(data.stats)
          setOrdersByStatus(data.ordersByStatus)
          setUsersByRole(data.usersByRole)
          setRecentOrders(data.recentOrders)
        }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false)
    }
    fetchStats()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
        ))}
      </div>
    )
  }

  // Prepare chart data
  const orderChartData = Object.entries(ordersByStatus).map(([status, count]) => ({
    name: getStatusLabel(status),
    count,
    color: statusColors[status] || '#94a3b8',
  }))

  const userChartData = Object.entries(usersByRole).map(([role, count]) => ({
    name: getRoleLabel(role),
    count,
  }))

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Tổng quan hệ thống</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="border-l-4 border-l-rose-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Người dùng</p>
                <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sạp hàng</p>
                <p className="text-2xl font-bold">{stats?.totalShops || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Store className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Đơn hàng</p>
                <p className="text-2xl font-bold">{stats?.totalOrders || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Doanh thu</p>
                <p className="text-2xl font-bold">{formatPrice(stats?.totalRevenue || 0)}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Summary */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tổng doanh thu hệ thống</p>
              <p className="text-3xl font-bold text-green-700">{formatPrice(stats?.totalRevenue || 0)}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Bao gồm doanh thu từ tất cả đơn hàng đã xác nhận trên nền tảng
          </p>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Orders by Status Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Đơn hàng theo trạng thái</CardTitle>
          </CardHeader>
          <CardContent>
            {orderChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={orderChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    angle={-15}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number) => [value, 'Số đơn']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={50}>
                    {orderChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-sm text-muted-foreground">Chưa có dữ liệu</div>
            )}
          </CardContent>
        </Card>

        {/* Users by Role Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Người dùng theo vai trò</CardTitle>
          </CardHeader>
          <CardContent>
            {userChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={userChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number) => [value, 'Số người']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Bar dataKey="count" fill="#16a34a" radius={[6, 6, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-sm text-muted-foreground">Chưa có dữ liệu</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Đơn hàng gần đây</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
            {recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Chưa có đơn hàng</p>
            ) : (
              recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">Đơn #{order.id.slice(-8)}</p>
                    <p className="text-xs text-muted-foreground">{order.buyer.name} · {formatDateTime(order.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{formatPrice(order.total)}</span>
                    <Badge className={`${getStatusColor(order.status)} text-xs`}>{getStatusLabel(order.status)}</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ==================== USERS TAB ====================
function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [editUser, setEditUser] = useState<AdminUser | null>(null)

  useEffect(() => {
    let cancelled = false
    const fetchUsers = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (search) params.set('search', search)
        if (roleFilter && roleFilter !== 'all') params.set('role', roleFilter)
        const res = await fetch(`/api/admin/users?${params}`)
        if (res.ok && !cancelled) {
          const data = await res.json()
          setUsers(data.users || [])
        }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false)
    }
    fetchUsers()
    return () => { cancelled = true }
  }, [search, roleFilter])

  const handleUpdateUser = async (userId: string, data: { role?: string; isActive?: boolean }) => {
    try {
      const res = await csrfFetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const resData = await res.json()
      if (!res.ok) throw new Error(resData.error)
      toast.success('Đã cập nhật người dùng')
      // Refresh user list
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (roleFilter && roleFilter !== 'all') params.set('role', roleFilter)
      const refreshRes = await fetch(`/api/admin/users?${params}`)
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json()
        setUsers(refreshData.users || [])
      }
      setEditUser(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Lỗi')
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Input
            placeholder="Tìm kiếm người dùng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Vai trò" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="BUYER">Người mua</SelectItem>
            <SelectItem value="SELLER">Tiểu thương</SelectItem>
            <SelectItem value="SHIPPER">Shipper</SelectItem>
            <SelectItem value="ADMIN">Quản trị viên</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">👥</div>
          <h3 className="text-lg font-semibold mb-1">Không tìm thấy người dùng</h3>
          <p className="text-muted-foreground">Thử thay đổi bộ lọc</p>
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Đơn hàng</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        {u.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{u.email}</TableCell>
                    <TableCell>
                      <Badge className={`${getRoleColor(u.role)} text-xs`}>{getRoleLabel(u.role)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.isActive ? 'default' : 'destructive'} className="text-xs">
                        {u.isActive ? 'Hoạt động' : 'Khóa'}
                      </Badge>
                    </TableCell>
                    <TableCell>{u._count.orders}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setEditUser(u)}>
                        <Shield className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => { if (!open) setEditUser(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quản lý người dùng</DialogTitle>
          </DialogHeader>
          {editUser && (
            <EditUserForm user={editUser} onSave={handleUpdateUser} onClose={() => setEditUser(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EditUserForm({ user, onSave, onClose }: { user: AdminUser; onSave: (id: string, data: { role?: string; isActive?: boolean }) => void; onClose: () => void }) {
  const [role, setRole] = useState(user.role)
  const [isActive, setIsActive] = useState(user.isActive)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await onSave(user.id, { role, isActive })
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="font-medium">{user.name}</p>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>
      <div className="space-y-2">
        <Label>Vai trò</Label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="BUYER">Người mua</SelectItem>
            <SelectItem value="SELLER">Tiểu thương</SelectItem>
            <SelectItem value="SHIPPER">Shipper</SelectItem>
            <SelectItem value="ADMIN">Quản trị viên</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={isActive} onCheckedChange={setIsActive} />
        <Label>{isActive ? 'Đang hoạt động' : 'Đã khóa'}</Label>
      </div>
      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Lưu
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
      </div>
    </form>
  )
}

// ==================== SHOPS TAB ====================
function ShopsTab() {
  const [shops, setShops] = useState<AdminShop[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const fetchShops = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/shops')
        if (res.ok && !cancelled) {
          const data = await res.json()
          setShops(data.shops || [])
        }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false)
    }
    fetchShops()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Sạp hàng</h2>
      {shops.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🏪</div>
          <h3 className="text-lg font-semibold mb-1">Chưa có sạp hàng</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shops.map((shop) => (
            <Card key={shop.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 text-lg">
                    🏪
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{shop.name}</h3>
                    <p className="text-xs text-muted-foreground">{shop.address}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>Chủ: {shop.owner.name}</span>
                      <span>{shop._count.products} SP</span>
                      <span>⭐ {shop.rating.toFixed(1)}</span>
                    </div>
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

// ==================== ORDERS TAB ====================
function OrdersTab() {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    let cancelled = false
    const fetchOrders = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
        const res = await fetch(`/api/orders?${params}`)
        if (res.ok && !cancelled) {
          const data = await res.json()
          setOrders(data.orders || [])
        }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false)
    }
    fetchOrders()
    return () => { cancelled = true }
  }, [statusFilter])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Đơn hàng</h2>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Lọc trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="PENDING">Chờ xác nhận</SelectItem>
            <SelectItem value="CONFIRMED">Đã xác nhận</SelectItem>
            <SelectItem value="PREPARING">Đang chuẩn bị</SelectItem>
            <SelectItem value="SHIPPING">Đang giao</SelectItem>
            <SelectItem value="DELIVERED">Đã giao</SelectItem>
            <SelectItem value="CANCELLED">Đã hủy</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📦</div>
          <h3 className="text-lg font-semibold mb-1">Không có đơn hàng</h3>
          <p className="text-muted-foreground">Đơn hàng sẽ xuất hiện khi có người mua đặt hàng</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-sm">Đơn #{order.id.slice(-8)}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</p>
                  </div>
                  <Badge className={`${getStatusColor(order.status)} text-xs`}>{getStatusLabel(order.status)}</Badge>
                </div>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Khách hàng</span>
                    <span>{order.buyer.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sạp hàng</span>
                    <span>{order.shop.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Thanh toán</span>
                    <span>{getPaymentStatusLabel(order.paymentStatus)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Tiền hàng</span>
                    <span>{formatPrice(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Phí ship</span>
                    <span>{formatPrice(order.shippingFee)}</span>
                  </div>
                  <hr className="my-1 border-t" />
                  <div className="flex justify-between font-bold">
                    <span>Tổng</span>
                    <span className="text-green-700">{formatPrice(order.total)}</span>
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
