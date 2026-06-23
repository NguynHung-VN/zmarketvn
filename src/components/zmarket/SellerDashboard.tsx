'use client'

import { useState, useEffect } from 'react'
import { csrfFetch } from '@/lib/csrf-fetch'
import { useAppStore } from '@/lib/store'
import { formatPrice, getStatusLabel, getStatusColor, formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import {
  LayoutDashboard, Package, ClipboardList, Store,
  Plus, Edit, Trash2, Loader2, DollarSign, ShoppingBag,
  MessageCircle, MessageSquareWarning, ImagePlus, X as XIcon, User, Settings
} from 'lucide-react'
import ChatPanel from './ChatPanel'
import FeedbackPanel from './FeedbackPanel'
import ProfileTab from './ProfileTab'
import SettingsTab from './SettingsTab'
import UserHeaderMenu from './UserHeaderMenu'
import { translations } from '@/lib/translations'

interface SellerProduct {
  id: string
  name: string
  description?: string | null
  price: number
  originalPrice?: number | null
  image?: string | null
  unit: string
  inStock: boolean
  rating: number
  soldCount: number
  categoryId: string
  category: { id: string; name: string; slug: string }
  _count: { orderItems: number; reviews: number }
  stockQuantity: number
  lowStockThreshold: number
  sku?: string | null
  weightGram?: number | null
  longDescription?: string | null
  origin?: string | null
  storageInfo?: string | null
  isActive: boolean
  variants?: { id: string; name: string; price: number; stockQuantity: number; sku?: string | null }[]
}

interface Category {
  id: string
  name: string
  slug: string
}

interface SellerOrder {
  id: string
  status: string
  subtotal: number
  total: number
  shippingFee: number
  address: string
  phone: string
  paymentMethod: string
  paymentStatus: string
  createdAt: string
  buyer: { id: string; name: string; phone: string; avatar?: string | null }
  shipper?: { id: string; name: string; phone: string } | null
  items: {
    id: string
    quantity: number
    price: number
    product: { id: string; name: string; image?: string | null; unit: string }
  }[]
}

interface ShopInfo {
  id: string
  name: string
  description?: string | null
  image?: string | null
  address: string
  phone?: string | null
  rating: number
}

// sellerTabs is now defined dynamically inside the SellerDashboard component using translation keys

export default function SellerDashboard() {
  const { user, currentTab, setTab, language, setLanguage } = useAppStore()
  const activeTab = currentTab || 'overview'
  const t = translations[language]

  const handleTabChange = (tab: string) => {
    setTab(tab)
  }

  const sellerTabs = [
    { id: 'overview', label: language === 'vi' ? 'Tổng quan' : 'Overview', icon: LayoutDashboard },
    { id: 'products', label: t.products, icon: Package },
    { id: 'orders', label: t.orders, icon: ClipboardList },
    { id: 'shop', label: t.shops, icon: Store },
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
            <Badge variant="secondary" className="bg-amber-100 text-amber-700">{t.role_seller}</Badge>
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
            {sellerTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-amber-50 text-amber-700'
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
            {sellerTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex flex-col items-center py-2 px-3 text-xs relative transition-colors ${
                  activeTab === tab.id ? 'text-amber-700' : 'text-muted-foreground'
                }`}
              >
                {activeTab === tab.id && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-amber-600 rounded-full" />
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
            {activeTab === 'products' && <ProductsTab />}
            {activeTab === 'orders' && <OrdersTab />}
            {activeTab === 'shop' && <ShopTab />}
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
  const [products, setProducts] = useState<SellerProduct[]>([])
  const [orders, setOrders] = useState<SellerOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const fetchData = async () => {
      setLoading(true)
      try {
        const [prodRes, orderRes] = await Promise.all([
          fetch('/api/seller/products'),
          fetch('/api/seller/orders'),
        ])
        if (prodRes.ok && !cancelled) {
          const data = await prodRes.json()
          setProducts(data.products || [])
        }
        if (orderRes.ok && !cancelled) {
          const data = await orderRes.json()
          setOrders(data.orders || [])
        }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false)
    }
    fetchData()
    return () => { cancelled = true }
  }, [])

  const totalRevenue = orders.filter(o => o.status === 'DELIVERED' || o.paymentStatus === 'PAID').reduce((sum, o) => sum + o.total, 0)
  const pendingOrders = orders.filter(o => o.status === 'PENDING').length

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
        ))}
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Tổng quan</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sản phẩm</p>
                <p className="text-2xl font-bold">{products.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <ShoppingBag className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Đơn hàng</p>
                <p className="text-2xl font-bold">{orders.length}</p>
                {pendingOrders > 0 && (
                  <p className="text-xs text-amber-600">{pendingOrders} chờ xác nhận</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Doanh thu</p>
                <p className="text-2xl font-bold">{formatPrice(totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Đơn hàng gần đây</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Chưa có đơn hàng</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
              {orders.slice(0, 10).map((order) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">Đơn #{order.id.slice(-8)}</p>
                    <p className="text-xs text-muted-foreground">{order.buyer.name} · {formatDateTime(order.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{formatPrice(order.total)}</span>
                    <Badge className={`${getStatusColor(order.status)} text-xs`}>
                      {getStatusLabel(order.status)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ==================== PRODUCTS TAB ====================
function ProductsTab() {
  const [products, setProducts] = useState<SellerProduct[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editProduct, setEditProduct] = useState<SellerProduct | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    const fetchData = async () => {
      setLoading(true)
      try {
        const [prodRes, catRes] = await Promise.all([
          fetch('/api/seller/products'),
          fetch('/api/categories'),
        ])
        if (prodRes.ok && !cancelled) {
          const data = await prodRes.json()
          setProducts(data.products || [])
        }
        if (catRes.ok && !cancelled) {
          const data = await catRes.json()
          setCategories(data.categories)
        }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false)
    }
    fetchData()
    return () => { cancelled = true }
  }, [refreshKey])

  const refresh = () => setRefreshKey(k => k + 1)

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa sản phẩm này?')) return
    try {
      const res = await csrfFetch(`/api/seller/products/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Đã xóa sản phẩm')
        refresh()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Xóa thất bại')
      }
    } catch { toast.error('Lỗi server') }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Sản phẩm</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" asChild>
            <a href="/seller/kho" className="flex items-center gap-1">
              <Package className="h-4 w-4" /> Quản lý kho
            </a>
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Thêm sản phẩm</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Thêm sản phẩm mới</DialogTitle>
              </DialogHeader>
              <ProductForm
                categories={categories}
                onSuccess={() => { setShowAddDialog(false); refresh() }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📦</div>
          <h3 className="text-lg font-semibold">Chưa có sản phẩm</h3>
          <p className="text-muted-foreground">Thêm sản phẩm đầu tiên cho sạp hàng của bạn</p>
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead>Danh mục</TableHead>
                  <TableHead>Giá</TableHead>
                  <TableHead>Tồn kho</TableHead>
                  <TableHead>Đã bán</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {product.image && (
                          <img src={product.image} alt={product.name} className="w-8 h-8 rounded object-cover" />
                        )}
                        {product.name}
                      </div>
                    </TableCell>
                    <TableCell>{product.category.name}</TableCell>
                    <TableCell>{formatPrice(product.price)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-sm">
                          {product.stockQuantity} {product.unit}
                        </span>
                        {product.stockQuantity === 0 ? (
                          <Badge variant="destructive" className="w-max text-xs bg-red-100 text-red-700 hover:bg-red-200 border-none">
                            Hết hàng
                          </Badge>
                        ) : product.stockQuantity <= product.lowStockThreshold ? (
                          <Badge className="w-max text-xs bg-amber-100 text-amber-700 hover:bg-amber-200 border-none">
                            Sắp hết
                          </Badge>
                        ) : (
                          <Badge className="w-max text-xs bg-green-100 text-green-700 hover:bg-green-200 border-none">
                            Còn hàng
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{product.soldCount}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditProduct(product)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(product.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editProduct} onOpenChange={(open) => { if (!open) setEditProduct(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa sản phẩm</DialogTitle>
          </DialogHeader>
          {editProduct && (
            <ProductForm
              product={editProduct}
              categories={categories}
              onSuccess={() => { setEditProduct(null); refresh() }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Product Form Component
function ProductForm({ product, categories, onSuccess }: {
  product?: SellerProduct | null
  categories: Category[]
  onSuccess: () => void
}) {
  const [name, setName] = useState(product?.name || '')
  const [description, setDescription] = useState(product?.description || '')
  const [price, setPrice] = useState(product?.price?.toString() || '')
  const [originalPrice, setOriginalPrice] = useState(product?.originalPrice?.toString() || '')
  const [unit, setUnit] = useState(product?.unit || 'kg')
  const [categoryId, setCategoryId] = useState(product?.categoryId || '')
  const [inStock, setInStock] = useState(product?.inStock ?? true)
  const [stockQuantity, setStockQuantity] = useState(product?.stockQuantity?.toString() || '0')
  const [lowStockThreshold, setLowStockThreshold] = useState(product?.lowStockThreshold?.toString() || '5')
  const [sku, setSku] = useState(product?.sku || '')
  const [weightGram, setWeightGram] = useState(product?.weightGram?.toString() || '')
  const [longDescription, setLongDescription] = useState(product?.longDescription || '')
  const [origin, setOrigin] = useState(product?.origin || '')
  const [storageInfo, setStorageInfo] = useState(product?.storageInfo || '')
  const [isActive, setIsActive] = useState(product?.isActive ?? true)
  const [variants, setVariants] = useState<{ id?: string; name: string; price: string; stockQuantity: string; sku?: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [productImages, setProductImages] = useState<string[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)

  // Load existing images and full details when editing
  useEffect(() => {
    if (product?.id) {
      fetch(`/api/seller/products/${product.id}/images`)
        .then(res => res.ok ? res.json() : { images: [] })
        .then(data => {
          if (data.images) {
            setProductImages(data.images.map((img: { url: string }) => img.url))
          }
        })
        .catch(() => { /* ignore */ })

      fetch(`/api/products/${product.id}`)
        .then(res => res.ok ? res.json() : { product: null })
        .then(data => {
          if (data.product) {
            if (data.product.longDescription) setLongDescription(data.product.longDescription)
            if (data.product.origin) setOrigin(data.product.origin)
            if (data.product.storageInfo) setStorageInfo(data.product.storageInfo)
            setIsActive(data.product.isActive ?? true)
            if (data.product.variants) {
              setVariants(data.product.variants.map((v: any) => ({
                id: v.id,
                name: v.name,
                price: v.price.toString(),
                stockQuantity: v.stockQuantity.toString(),
                sku: v.sku || ''
              })))
            }
          }
        })
        .catch(() => { /* ignore */ })
    }
  }, [product?.id])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    setUploadingImage(true)
    for (const file of Array.from(files)) {
      const formData = new FormData()
      formData.append('file', file)
      try {
        const res = await csrfFetch('/api/upload', { method: 'POST', body: formData })
        if (res.ok) {
          const data = await res.json()
          setProductImages(prev => [...prev, data.url])
        } else {
          toast.error('Tải ảnh thất bại')
        }
      } catch {
        toast.error('Lỗi tải ảnh')
      }
    }
    setUploadingImage(false)
    e.target.value = ''
  }

  const removeImage = (index: number) => {
    setProductImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {
        name,
        description: description || undefined,
        longDescription: longDescription || undefined,
        price: parseFloat(price),
        originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
        unit,
        categoryId,
        inStock,
        stockQuantity: parseInt(stockQuantity, 10) || 0,
        lowStockThreshold: parseInt(lowStockThreshold, 10) || 5,
        sku: sku || undefined,
        weightGram: weightGram ? parseInt(weightGram, 10) : undefined,
        origin: origin || undefined,
        storageInfo: storageInfo || undefined,
        isActive,
        images: productImages,
        variants: variants.map(v => ({
          id: v.id,
          name: v.name,
          price: parseFloat(v.price) || 0,
          stockQuantity: parseInt(v.stockQuantity, 10) || 0,
          sku: v.sku || undefined
        }))
      }
      const url = product ? `/api/seller/products/${product.id}` : '/api/seller/products'
      const method = product ? 'PUT' : 'POST'
      const res = await csrfFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Lỗi')

      toast.success(product ? 'Đã cập nhật sản phẩm' : 'Đã tạo sản phẩm')
      onSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Lỗi')
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Tên sản phẩm *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>Mô tả ngắn</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </div>
      <div className="space-y-2">
        <Label>Mô tả chi tiết (Markdown)</Label>
        <Textarea value={longDescription} onChange={(e) => setLongDescription(e.target.value)} rows={4} placeholder="Mô tả chi tiết về sản phẩm, cách chế biến, dinh dưỡng..." />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Giá bán *</Label>
          <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required min="0" step="1000" />
        </div>
        <div className="space-y-2">
          <Label>Giá gốc</Label>
          <Input type="number" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} min="0" step="1000" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Đơn vị</Label>
          <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Danh mục *</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger><SelectValue placeholder="Chọn danh mục" /></SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Số lượng tồn kho *</Label>
          <Input type="number" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} required min="0" />
        </div>
        <div className="space-y-2">
          <Label>Ngưỡng cảnh báo hết hàng *</Label>
          <Input type="number" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} required min="0" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Mã sản phẩm (SKU)</Label>
          <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="VD: CAM-SANH-01" />
        </div>
        <div className="space-y-2">
          <Label>Trọng lượng (Gram)</Label>
          <Input type="number" value={weightGram} onChange={(e) => setWeightGram(e.target.value)} placeholder="VD: 500" min="1" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Xuất xứ</Label>
          <Input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="VD: Đà Lạt, Việt Nam" />
        </div>
        <div className="space-y-2">
          <Label>Hướng dẫn bảo quản</Label>
          <Input value={storageInfo} onChange={(e) => setStorageInfo(e.target.value)} placeholder="VD: Ngăn mát tủ lạnh 2-5°C" />
        </div>
      </div>

      {/* Dynamic Variants Editor */}
      <div className="space-y-2 border-t pt-4">
        <div className="flex items-center justify-between mb-2">
          <Label className="font-bold text-sm text-green-700">Biến thể / Phân loại sản phẩm</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setVariants(prev => [...prev, { name: '', price: price || '0', stockQuantity: '0', sku: '' }])}
          >
            + Thêm phân loại
          </Button>
        </div>
        {variants.length > 0 && (
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {variants.map((v, i) => (
              <div key={i} className="flex flex-col gap-2 p-3 bg-muted/40 rounded-lg border">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-muted-foreground">Phân loại #{i + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-6 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setVariants(prev => prev.filter((_, idx) => idx !== i))}
                  >
                    Xoá
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Tên phân loại</Label>
                    <Input
                      value={v.name}
                      onChange={(e) => {
                        const newVariants = [...variants]
                        newVariants[i].name = e.target.value
                        setVariants(newVariants)
                      }}
                      required
                      placeholder="VD: Bó 500g"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Giá bán (VND)</Label>
                    <Input
                      type="number"
                      value={v.price}
                      onChange={(e) => {
                        const newVariants = [...variants]
                        newVariants[i].price = e.target.value
                        setVariants(newVariants)
                      }}
                      required
                      className="h-8 text-xs"
                      min="0"
                      step="1000"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Tồn kho</Label>
                    <Input
                      type="number"
                      value={v.stockQuantity}
                      onChange={(e) => {
                        const newVariants = [...variants]
                        newVariants[i].stockQuantity = e.target.value
                        setVariants(newVariants)
                      }}
                      required
                      className="h-8 text-xs"
                      min="0"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Mã SKU</Label>
                    <Input
                      value={v.sku}
                      onChange={(e) => {
                        const newVariants = [...variants]
                        newVariants[i].sku = e.target.value
                        setVariants(newVariants)
                      }}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-4 border-t pt-2">
        <div className="flex items-center gap-2">
          <Switch checked={inStock} onCheckedChange={setInStock} />
          <Label>Còn hàng</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={isActive} onCheckedChange={setIsActive} />
          <Label>Cho phép hiển thị/bán</Label>
        </div>
      </div>

      {/* Image Upload Section */}
      <div className="space-y-2">
        <Label>Hình ảnh sản phẩm</Label>
        <div className="flex items-center gap-2">
          <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg hover:border-amber-400 hover:bg-amber-50/50 transition-colors text-sm text-muted-foreground">
            <ImagePlus className="h-4 w-4" />
            Thêm hình ảnh
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
              disabled={uploadingImage}
            />
          </label>
          {uploadingImage && <Loader2 className="h-4 w-4 animate-spin text-amber-600" />}
        </div>
        {productImages.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mt-2">
            {productImages.map((url, index) => (
              <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border bg-gray-50">
                <img src={url} alt={`Ảnh ${index + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {product ? 'Cập nhật' : 'Tạo sản phẩm'}
      </Button>
    </form>
  )
}

// ==================== ORDERS TAB ====================
function OrdersTab() {
  const [orders, setOrders] = useState<SellerOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    let cancelled = false
    const fetchOrders = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
        const res = await fetch(`/api/seller/orders?${params}`)
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

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      const res = await csrfFetch(`/api/seller/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Đã cập nhật trạng thái')
      // Refresh orders
      const params = new URLSearchParams()
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
      const refreshRes = await fetch(`/api/seller/orders?${params}`)
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json()
        setOrders(refreshData.orders || [])
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Lỗi')
    }
  }

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
          <div className="text-5xl mb-4">📋</div>
          <h3 className="text-lg font-semibold">Chưa có đơn hàng</h3>
          <p className="text-muted-foreground">Đơn hàng sẽ xuất hiện khi có người mua đặt</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-sm">Đơn #{order.id.slice(-8)}</p>
                    <p className="text-xs text-muted-foreground">
                      Khách: {order.buyer.name} · {order.buyer.phone}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</p>
                  </div>
                  <Badge className={`${getStatusColor(order.status)} text-xs`}>
                    {getStatusLabel(order.status)}
                  </Badge>
                </div>

                <div className="space-y-1 mb-3 text-sm">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <span>{item.product.name} x{item.quantity}</span>
                      <span>{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                  <Separator className="my-1" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Tiền hàng:</span>
                    <span>{formatPrice(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Phí ship:</span>
                    <span>{formatPrice(order.shippingFee)}</span>
                  </div>
                  <Separator className="my-1" />
                  <div className="flex justify-between font-bold">
                    <span>Tổng:</span>
                    <span className="text-green-700">{formatPrice(order.total)}</span>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground mb-3">
                  📍 {order.address} · 📞 {order.phone}
                </div>

                <div className="flex gap-2">
                  {order.status === 'PENDING' && (
                    <>
                      <Button size="sm" onClick={() => handleUpdateStatus(order.id, 'CONFIRMED')}>
                        Xác nhận
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleUpdateStatus(order.id, 'CANCELLED')}>
                        Hủy đơn
                      </Button>
                    </>
                  )}
                  {order.status === 'CONFIRMED' && (
                    <Button size="sm" onClick={() => handleUpdateStatus(order.id, 'PREPARING')}>
                      Chuẩn bị hàng
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

// ==================== SHOP TAB ====================
function ShopTab() {
  const { user } = useAppStore()
  const [shop, setShop] = useState<ShopInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const fetchShop = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/shops')
        if (res.ok && !cancelled) {
          const data = await res.json()
          const myShop = data.shops?.find((s: ShopInfo & { owner: { id: string } }) => s.owner?.id === user?.id)
          if (myShop && !cancelled) setShop(myShop)
        }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false)
    }
    fetchShop()
    return () => { cancelled = true }
  }, [user])

  if (loading) {
    return <Card><CardContent className="p-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
  }

  if (!shop) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">🏪</div>
        <h3 className="text-lg font-semibold">Chưa có sạp hàng</h3>
        <p className="text-muted-foreground">Liên hệ quản trị viên để tạo sạp hàng</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-bold mb-4">Thông tin sạp hàng</h2>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-xl bg-amber-100 flex items-center justify-center text-2xl">
              🏪
            </div>
            <div>
              <h3 className="text-lg font-semibold">{shop.name}</h3>
              <Badge className="bg-amber-100 text-amber-700">⭐ {shop.rating.toFixed(1)}</Badge>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Mô tả</p>
              <p className="text-sm">{shop.description || 'Chưa có mô tả'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Địa chỉ</p>
              <p className="text-sm">{shop.address}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Số điện thoại</p>
              <p className="text-sm">{shop.phone || 'Chưa cập nhật'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
