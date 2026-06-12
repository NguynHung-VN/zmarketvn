'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { csrfFetch } from '@/lib/csrf-fetch'
import { useAppStore } from '@/lib/store'
import { formatPrice, getStatusLabel, getStatusColor, getPaymentStatusLabel, getPaymentStatusColor, getPaymentMethodLabel, formatDateTime, renderStars } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  ShoppingBag, Store, ShoppingCart, ClipboardList, User,
  Search, Plus, Minus, Trash2, Star, MapPin, Phone,
  Loader2, Package, ChevronLeft, ChevronRight, ArrowLeft,
  MessageSquare, CheckCircle2, Eye, Heart, MessageCircle,
  MessageSquareWarning, ShoppingBasket, FileText, PackageOpen
} from 'lucide-react'
import ChatPanel from './ChatPanel'
import FeedbackPanel from './FeedbackPanel'

// Types
interface Product {
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
  shopId: string
  categoryId: string
  shop: { id: string; name: string; image?: string | null; rating: number }
  category: { id: string; name: string; slug: string }
}

interface ProductDetail extends Product {
  reviews: Review[]
  shop: { id: string; name: string; image?: string | null; rating: number; address?: string | null; phone?: string | null }
}

interface Review {
  id: string
  rating: number
  comment?: string | null
  createdAt: string
  user: { id: string; name: string; avatar?: string | null }
}

interface Category {
  id: string
  name: string
  icon?: string | null
  slug: string
  _count: { products: number }
}

interface Shop {
  id: string
  name: string
  description?: string | null
  image?: string | null
  address: string
  phone?: string | null
  rating: number
  isActive: boolean
  owner: { id: string; name: string }
  _count: { products: number }
}

interface OrderItem {
  id: string
  quantity: number
  price: number
  productId: string
  product: { id: string; name: string; image?: string | null; unit: string }
}

interface Order {
  id: string
  status: string
  total: number
  shippingFee: number
  address: string
  phone: string
  note?: string | null
  paymentMethod: string
  paymentStatus: string
  buyerId: string
  shopId: string
  shipperId?: string | null
  createdAt: string
  updatedAt: string
  shop: { id: string; name: string; image?: string | null; address?: string | null }
  shipper?: { id: string; name: string; phone: string } | null
  items: OrderItem[]
}

// Star rating display helper
function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5'
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${sizeClass} ${i < Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 fill-gray-200'}`}
        />
      ))}
    </div>
  )
}

// Interactive star picker for reviews
function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <button
          key={i}
          type="button"
          className="transition-transform hover:scale-110"
          onMouseEnter={() => setHovered(i + 1)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(i + 1)}
        >
          <Star className={`h-7 w-7 ${(hovered || value) > i ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
        </button>
      ))}
    </div>
  )
}

// Discount badge helper
function DiscountBadge({ originalPrice, price }: { originalPrice: number; price: number }) {
  if (!originalPrice || originalPrice <= price) return null
  const discount = Math.round(((originalPrice - price) / originalPrice) * 100)
  return (
    <Badge className="bg-red-500 text-white text-xs font-bold shadow-sm">
      -{discount}%
    </Badge>
  )
}

const buyerTabs = [
  { id: 'products', label: 'Sản phẩm', icon: ShoppingBag },
  { id: 'shops', label: 'Sạp hàng', icon: Store },
  { id: 'wishlist', label: 'Yêu thích', icon: Heart },
  { id: 'cart', label: 'Giỏ hàng', icon: ShoppingCart },
  { id: 'orders', label: 'Đơn hàng', icon: ClipboardList },
  { id: 'chat', label: 'Nhắn tin', icon: MessageCircle },
  { id: 'feedback', label: 'Phản hồi', icon: MessageSquareWarning },
  { id: 'profile', label: 'Hồ sơ', icon: User },
]

export default function BuyerDashboard() {
  const { user, currentTab, setTab, cart, fetchCart, addToCart, updateCartItem, removeCartItem } = useAppStore()
  const activeTab = currentTab || 'products'

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
            <Badge variant="secondary" className="bg-green-100 text-green-700">Người mua</Badge>
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
        {/* Sidebar */}
        <aside className="hidden md:flex w-56 bg-white border-r flex-col">
          <nav className="p-3 space-y-1">
            {buyerTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-green-50 text-green-700'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {tab.id === 'cart' && cart.length > 0 && (
                  <Badge className="ml-auto bg-green-600 text-white text-xs h-5 min-w-5">{cart.length}</Badge>
                )}
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile Tab Bar - polished with active indicator */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t z-50 safe-area-pb">
          <div className="flex justify-around">
            {buyerTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex flex-col items-center py-2 px-3 text-xs relative transition-colors ${
                  activeTab === tab.id ? 'text-green-700' : 'text-muted-foreground'
                }`}
              >
                {activeTab === tab.id && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-green-600 rounded-full" />
                )}
                <div className="relative">
                  <tab.icon className={`h-5 w-5 transition-transform ${activeTab === tab.id ? 'scale-110' : ''}`} />
                  {tab.id === 'cart' && cart.length > 0 && (
                    <span className="absolute -top-1 -right-2 bg-green-600 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
                      {cart.length}
                    </span>
                  )}
                </div>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 pb-20 md:pb-6">
          <div className="animate-fadeIn">
            {activeTab === 'products' && <ProductsTab />}
            {activeTab === 'shops' && <ShopsTab />}
            {activeTab === 'wishlist' && <WishlistTab />}
            {activeTab === 'cart' && <CartTab />}
            {activeTab === 'orders' && <OrdersTab />}
            {activeTab === 'chat' && user && <ChatPanel userId={user.id} userName={user.name} />}
            {activeTab === 'feedback' && user && <FeedbackPanel userId={user.id} userRole={user.role} />}
            {activeTab === 'profile' && <ProfileTab />}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-400 mt-auto">
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

// ==================== PRODUCTS TAB ====================
function ProductsTab() {
  const { addToCart } = useAppStore()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [imageLoadingMap, setImageLoadingMap] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let cancelled = false
    const fetchData = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set('page', page.toString())
        params.set('limit', '12')
        if (search) params.set('search', search)
        if (selectedCategory && selectedCategory !== 'all') params.set('categoryId', selectedCategory)

        const res = await fetch(`/api/products?${params}`)
        if (res.ok && !cancelled) {
          const data = await res.json()
          setProducts(data.products)
          setTotalPages(data.pagination.totalPages)
        }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false)
    }
    fetchData()
    return () => { cancelled = true }
  }, [page, search, selectedCategory])

  useEffect(() => {
    let cancelled = false
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/categories')
        if (res.ok && !cancelled) {
          const data = await res.json()
          setCategories(data.categories)
        }
      } catch { /* ignore */ }
    }
    fetchCategories()
    return () => { cancelled = true }
  }, [])

  const handleAddToCart = async (productId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    try {
      await addToCart(productId)
      toast.success('Đã thêm vào giỏ hàng 🛒')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể thêm vào giỏ hàng')
    }
  }

  const handleImageLoad = (productId: string) => {
    setImageLoadingMap(prev => ({ ...prev, [productId]: false }))
  }

  const handleImageStart = (productId: string) => {
    setImageLoadingMap(prev => ({ ...prev, [productId]: true }))
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm sản phẩm..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <Select value={selectedCategory} onValueChange={(v) => { setSelectedCategory(v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Danh mục" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả danh mục</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name} ({cat._count.products})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="overflow-hidden border-0 shadow-sm">
              <Skeleton className="h-44 w-full rounded-none" />
              <CardContent className="p-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex gap-2 pt-1">
                  <Skeleton className="h-7 flex-1 rounded-md" />
                  <Skeleton className="h-7 w-7 rounded-md" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-5">
            <Search className="h-9 w-9 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-bold mb-1">Không tìm thấy sản phẩm</h3>
          <p className="text-muted-foreground">Thử thay đổi từ khóa hoặc danh mục</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product, idx) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.03 }}
              >
                <Card
                  className="overflow-hidden group hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer border-0 shadow-sm h-full"
                  onClick={() => setSelectedProductId(product.id)}
                >
                  <div className="h-44 bg-muted flex items-center justify-center relative overflow-hidden">
                    {/* Skeleton placeholder while image loads */}
                    {imageLoadingMap[product.id] !== false && product.image && (
                      <Skeleton className="absolute inset-0" />
                    )}
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ${imageLoadingMap[product.id] === false ? 'opacity-100' : 'opacity-0'}`}
                        onLoad={() => handleImageLoad(product.id)}
                        onError={() => handleImageLoad(product.id)}
                      />
                    ) : (
                      <Package className="h-10 w-10 text-muted-foreground/40" />
                    )}
                    {/* Discount badge - positioned top-left */}
                    {product.originalPrice && product.originalPrice > product.price && (
                      <div className="absolute top-2 left-2">
                        <DiscountBadge originalPrice={product.originalPrice} price={product.price} />
                      </div>
                    )}
                    {/* Out of stock overlay */}
                    {!product.inStock && (
                      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center">
                        <span className="bg-white/90 text-gray-800 font-semibold text-xs px-3 py-1.5 rounded-full">Hết hàng</span>
                      </div>
                    )}
                    {/* Quick view overlay on hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <span className="bg-white/90 backdrop-blur-sm text-xs font-medium px-3 py-1.5 rounded-full shadow-md transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                        👁 Xem chi tiết
                      </span>
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-medium text-sm line-clamp-2 mb-1 min-h-[2.5rem]">{product.name}</h3>
                    {/* Shop name with icon */}
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                      <Store className="h-3 w-3" />
                      {product.shop.name}
                    </p>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-green-700 font-bold">{formatPrice(product.price)}</span>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <span className="text-xs text-muted-foreground line-through">{formatPrice(product.originalPrice)}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <StarRating rating={product.rating} />
                        <span className="text-xs text-muted-foreground ml-0.5">{product.rating.toFixed(1)}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">Đã bán {product.soldCount}</span>
                    </div>
                    {/* Add to cart + Wishlist row */}
                    <div className="flex gap-1.5 mt-2">
                      <Button
                        size="sm"
                        className="flex-1 h-8 text-xs bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-sm hover:shadow-md transition-all"
                        onClick={(e) => handleAddToCart(product.id, e)}
                        disabled={!product.inStock}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Thêm vào giỏ
                      </Button>
                      <WishlistHeartButton productId={product.id} />
                    </div>
                    {/* View detail link */}
                    <button
                      className="w-full mt-1.5 text-xs text-green-600 hover:text-green-800 flex items-center justify-center gap-1 transition-colors"
                      onClick={(e) => { e.stopPropagation(); setSelectedProductId(product.id) }}
                    >
                      <Eye className="h-3 w-3" />
                      Xem chi tiết
                    </button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Trang {page} / {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Product Detail Dialog */}
      {selectedProductId && (
        <ProductDetailDialog
          productId={selectedProductId}
          open={!!selectedProductId}
          onClose={() => setSelectedProductId(null)}
          onAddToCart={handleAddToCart}
        />
      )}
    </div>
  )
}

// ==================== PRODUCT DETAIL DIALOG ====================
function ProductDetailDialog({
  productId,
  open,
  onClose,
  onAddToCart,
}: {
  productId: string
  open: boolean
  onClose: () => void
  onAddToCart: (id: string, e?: React.MouseEvent) => void
}) {
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const fetchProduct = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/products/${productId}`)
        if (res.ok && !cancelled) {
          const data = await res.json()
          setProduct(data.product)
        }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false)
    }
    fetchProduct()
    return () => { cancelled = true }
  }, [productId, open])

  // Reset quantity when dialog closes via onClose callback
  const handleClose = () => {
    setQuantity(1)
    onClose()
  }

  const handleAdd = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (product) {
      for (let i = 0; i < quantity; i++) {
        onAddToCart(product.id, e)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {loading ? (
          <div className="space-y-4 p-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ) : product ? (
          <div>
            <DialogHeader>
              <DialogTitle className="sr-only">Chi tiết sản phẩm</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Product Image */}
              <div className="rounded-xl overflow-hidden bg-muted aspect-square">
                {product.image ? (
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="flex flex-col">
                <h2 className="text-xl font-bold mb-2">{product.name}</h2>

                {/* Rating & Sold */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-1">
                    <StarRating rating={product.rating} size="md" />
                    <span className="text-sm font-medium">{product.rating.toFixed(1)}</span>
                  </div>
                  <Separator orientation="vertical" className="h-4" />
                  <span className="text-sm text-muted-foreground">Đã bán {product.soldCount}</span>
                </div>

                {/* Price */}
                <div className="bg-green-50 rounded-lg p-3 mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-green-700">{formatPrice(product.price)}</span>
                    {product.originalPrice && product.originalPrice > product.price && (
                      <>
                        <span className="text-sm text-muted-foreground line-through">{formatPrice(product.originalPrice)}</span>
                        <DiscountBadge originalPrice={product.originalPrice} price={product.price} />
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Đơn vị: {product.unit}</p>
                </div>

                {/* Shop info */}
                <div
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 mb-4 cursor-pointer hover:bg-muted transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                    {product.shop.image ? (
                      <img src={product.shop.image} alt={product.shop.name} className="w-full h-full rounded-lg object-cover" />
                    ) : (
                      <Store className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{product.shop.name}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <StarRating rating={product.shop.rating} />
                      <span>{product.shop.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {product.description && (
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground">{product.description}</p>
                  </div>
                )}

                {/* Quantity Picker */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-sm font-medium">Số lượng:</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-10 text-center font-medium">{quantity}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setQuantity(quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Add to cart button */}
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white h-11 text-base font-semibold"
                  onClick={handleAdd}
                  disabled={!product.inStock}
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  {product.inStock ? 'Thêm vào giỏ' : 'Hết hàng'}
                </Button>
              </div>
            </div>

            {/* Reviews Section */}
            <div className="mt-6 border-t pt-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Đánh giá sản phẩm ({product.reviews?.length || 0})
              </h3>
              {(!product.reviews || product.reviews.length === 0) ? (
                <p className="text-sm text-muted-foreground text-center py-6">Chưa có đánh giá nào</p>
              ) : (
                <div className="space-y-4 max-h-64 overflow-y-auto custom-scrollbar">
                  {product.reviews.map((review) => (
                    <div key={review.id} className="flex gap-3 p-3 rounded-lg bg-muted/30">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0 text-sm font-medium text-green-700">
                        {review.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{review.user.name}</span>
                          <StarRating rating={review.rating} />
                        </div>
                        {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
                        <p className="text-xs text-muted-foreground mt-1">{formatDateTime(review.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Không tìm thấy sản phẩm</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ==================== SHOPS TAB ====================
function ShopsTab() {
  const [shops, setShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const fetchShops = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (search) params.set('search', search)
        const res = await fetch(`/api/shops?${params}`)
        if (res.ok && !cancelled) {
          const data = await res.json()
          setShops(data.shops)
        }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false)
    }
    fetchShops()
    return () => { cancelled = true }
  }, [search])

  // If a shop is selected, show shop detail
  if (selectedShopId) {
    return <ShopDetailView shopId={selectedShopId} onBack={() => setSelectedShopId(null)} />
  }

  return (
    <div>
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm kiếm sạp hàng..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-4 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : shops.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-24 h-24 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-5">
            <Store className="h-11 w-11 text-amber-300" />
          </div>
          <h3 className="text-lg font-bold mb-1">Không tìm thấy sạp hàng</h3>
          <p className="text-muted-foreground">Thử thay đổi từ khóa tìm kiếm</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shops.map((shop) => (
            <Card
              key={shop.id}
              className="hover:shadow-xl hover:scale-[1.01] transition-all duration-300 cursor-pointer border-0 shadow-sm"
              onClick={() => setSelectedShopId(shop.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center shrink-0 overflow-hidden">
                    {shop.image ? (
                      <img src={shop.image} alt={shop.name} className="w-full h-full rounded-xl object-cover" />
                    ) : (
                      <Store className="h-7 w-7 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{shop.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{shop.address}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <StarRating rating={shop.rating} />
                        <span>{shop.rating.toFixed(1)}</span>
                      </span>
                      <span>{shop._count.products} sản phẩm</span>
                    </div>
                    {shop.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{shop.description}</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== SHOP DETAIL VIEW ====================
function ShopDetailView({ shopId, onBack }: { shopId: string; onBack: () => void }) {
  const [shop, setShop] = useState<Shop | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const { addToCart } = useAppStore()

  useEffect(() => {
    let cancelled = false
    const fetchData = async () => {
      setLoading(true)
      try {
        const [shopRes, prodRes] = await Promise.all([
          fetch(`/api/shops/${shopId}`),
          fetch(`/api/products?shopId=${shopId}&limit=50`),
        ])
        if (shopRes.ok && !cancelled) {
          const shopData = await shopRes.json()
          setShop(shopData.shop)
        }
        if (prodRes.ok && !cancelled) {
          const prodData = await prodRes.json()
          setProducts(prodData.products)
        }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false)
    }
    fetchData()
    return () => { cancelled = true }
  }, [shopId])

  const handleAddToCart = async (productId: string) => {
    try {
      await addToCart(productId)
      toast.success('Đã thêm vào giỏ hàng 🛒')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể thêm vào giỏ hàng')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-3"><Skeleton className="h-32 w-full mb-2" /><Skeleton className="h-4 w-3/4" /></CardContent></Card>
          ))}
        </div>
      </div>
    )
  }

  if (!shop) return null

  return (
    <div>
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Quay lại
      </Button>

      {/* Shop Banner & Info */}
      <Card className="mb-6 overflow-hidden">
        <div className="h-32 sm:h-40 bg-gradient-to-r from-green-600 to-emerald-700 relative">
          {shop.image && (
            <img src={shop.image} alt={shop.name} className="absolute inset-0 w-full h-full object-cover opacity-30" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
        <CardContent className="p-6 -mt-10 relative">
          <div className="flex items-end gap-4">
            <div className="w-16 h-16 rounded-xl bg-white shadow-md flex items-center justify-center border-2 border-white shrink-0 overflow-hidden">
              {shop.image ? (
                <img src={shop.image} alt={shop.name} className="w-full h-full object-cover" />
              ) : (
                <Store className="h-8 w-8 text-green-600" />
              )}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <h2 className="text-xl font-bold">{shop.name}</h2>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <StarRating rating={shop.rating} />
                  <span className="font-medium">{shop.rating.toFixed(1)}</span>
                </span>
                <span>{shop._count.products} sản phẩm</span>
              </div>
            </div>
          </div>
          {shop.description && (
            <p className="text-sm text-muted-foreground mt-3">{shop.description}</p>
          )}
          <div className="flex flex-col sm:flex-row gap-2 mt-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{shop.address}</span>
            {shop.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{shop.phone}</span>}
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      <h3 className="font-semibold mb-4">Sản phẩm của sạp hàng</h3>
      {products.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📦</div>
          <p className="text-muted-foreground">Sạp hàng chưa có sản phẩm</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <Card
              key={product.id}
              className="overflow-hidden group hover:shadow-md hover:scale-[1.02] transition-all duration-200"
            >
              <div className="h-36 bg-muted relative overflow-hidden">
                {product.image ? (
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Package className="h-8 w-8 text-muted-foreground" /></div>
                )}
                {product.originalPrice && product.originalPrice > product.price && (
                  <DiscountBadge originalPrice={product.originalPrice} price={product.price} />
                )}
              </div>
              <CardContent className="p-3">
                <h4 className="font-medium text-sm line-clamp-2 mb-1">{product.name}</h4>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-green-700 font-bold text-sm">{formatPrice(product.price)}</span>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="text-xs text-muted-foreground line-through">{formatPrice(product.originalPrice)}</span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                  <StarRating rating={product.rating} />
                  <span>{product.rating.toFixed(1)}</span>
                  <span className="ml-1">| {product.soldCount} đã bán</span>
                </div>
                <Button
                  size="sm"
                  className="w-full h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleAddToCart(product.id)}
                  disabled={!product.inStock}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Thêm vào giỏ
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== CART TAB ====================
function CartTab() {
  const { cart, cartTotal, updateCartItem, removeCartItem, fetchCart } = useAppStore()
  const [checkingOut, setCheckingOut] = useState(false)
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')

  const handleCheckout = async () => {
    if (!address.trim()) { toast.error('Vui lòng nhập địa chỉ giao hàng'); return }
    if (!phone.trim()) { toast.error('Vui lòng nhập số điện thoại'); return }
    setCheckingOut(true)
    try {
      const res = await csrfFetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, phone, note: note || undefined, paymentMethod: 'COD', shippingFee: 15000 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Đặt hàng thất bại')
      toast.success('Đặt hàng thành công! 🎉')
      await fetchCart()
      setAddress('')
      setPhone('')
      setNote('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Đặt hàng thất bại')
    }
    setCheckingOut(false)
  }

  if (cart.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-24 h-24 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
          <ShoppingBasket className="h-11 w-11 text-green-300" />
        </div>
        <h3 className="text-lg font-bold mb-1">Giỏ hàng trống</h3>
        <p className="text-muted-foreground mb-4">Hãy thêm sản phẩm vào giỏ hàng</p>
        <Button variant="outline" className="text-green-700 border-green-200 hover:bg-green-50" onClick={() => useAppStore.getState().setTab('products')}>
          Khám phá sản phẩm
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <ShoppingCart className="h-5 w-5 text-green-600" />
        Giỏ hàng ({cart.length} sản phẩm)
      </h2>
      <div className="space-y-3 mb-6">
        <AnimatePresence>
          {cart.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="hover:shadow-md transition-all border-0 shadow-sm overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                      {item.product.image ? (
                        <img src={item.product.image} alt={item.product.name} className="w-full h-full rounded-xl object-cover" />
                      ) : (
                        <Package className="h-7 w-7 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm truncate">{item.product.name}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.product.shop.name} · {item.product.unit}</p>
                      <p className="text-green-700 font-bold text-sm mt-1">{formatPrice(item.product.price)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                        onClick={() => removeCartItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-white"
                          onClick={() => updateCartItem(item.id, Math.max(1, item.quantity - 1))}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-white"
                          onClick={() => updateCartItem(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tạm tính</span>
              <span className="font-medium">{formatPrice(cartTotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Phí giao hàng</span>
              <span className="font-medium">{formatPrice(15000)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Tổng cộng</span>
              <span className="text-green-700">{formatPrice(cartTotal + 15000)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <MapPin className="h-4 w-4 text-green-600" />
          Thông tin giao hàng
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs font-medium">Địa chỉ giao hàng *</Label>
            <Input placeholder="Số nhà, đường, quận..." value={address} onChange={(e) => setAddress(e.target.value)} className="transition-all focus:ring-2 focus:ring-green-200" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Số điện thoại *</Label>
            <Input placeholder="0901234567" value={phone} onChange={(e) => setPhone(e.target.value)} className="transition-all focus:ring-2 focus:ring-green-200" />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium">Ghi chú</Label>
          <Textarea placeholder="Ghi chú cho người giao hàng..." value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        </div>
        <Button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white h-12 text-base font-semibold shadow-md hover:shadow-lg transition-all" size="lg" onClick={handleCheckout} disabled={checkingOut}>
          {checkingOut ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang đặt hàng...</>
          ) : (
            <>
              <ShoppingCart className="mr-2 h-5 w-5" />
              Đặt hàng (COD)
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

// ==================== ORDERS TAB ====================
function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [ratingOrderId, setRatingOrderId] = useState<string | null>(null)
  const [ratedOrderIds, setRatedOrderIds] = useState<Set<string>>(new Set())

  const fetchOrders = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/orders?${params}`)
      if (res.ok) {
        const data = await res.json()
        setOrders(data.orders)
      }
    } catch { /* ignore */ }
  }, [statusFilter])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      await fetchOrders()
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [fetchOrders])

  const handleCancel = async (orderId: string) => {
    try {
      const res = await csrfFetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Đã hủy đơn hàng')
      fetchOrders()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể hủy đơn hàng')
    }
  }

  const handleRateSubmit = async (orderId: string, productId: string, rating: number, comment: string) => {
    try {
      const res = await csrfFetch(`/api/products/${productId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Đánh giá thất bại')
      toast.success('Cảm ơn bạn đã đánh giá! ⭐')
      setRatedOrderIds(prev => new Set(prev).add(orderId))
      setRatingOrderId(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Đánh giá thất bại')
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
        <div className="text-center py-20">
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-5">
            <FileText className="h-11 w-11 text-muted-foreground/40" />
          </div>
          <h3 className="text-lg font-bold mb-1">Chưa có đơn hàng</h3>
          <p className="text-muted-foreground">Đơn hàng của bạn sẽ xuất hiện ở đây</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-all border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-sm">Đơn #{order.id.slice(-8)}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <Badge className={`${getStatusColor(order.status)} text-xs`}>
                      {getStatusLabel(order.status)}
                    </Badge>
                    <Badge className={`${getPaymentStatusColor(order.paymentStatus)} text-xs`}>
                      {getPaymentStatusLabel(order.paymentStatus)}
                    </Badge>
                    {/* Rated badge */}
                    {ratedOrderIds.has(order.id) && (
                      <Badge className="bg-green-100 text-green-700 text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Đã đánh giá
                      </Badge>
                    )}
                  </div>
                </div>
          {/* Shop name with icon */}
                  <div className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                    <Store className="h-3.5 w-3.5" />
                    {order.shop.name}
                  </div>
                <div className="space-y-1 mb-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>{item.product.name} x{item.quantity}</span>
                      <span>{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                  <Separator className="my-1" />
                  <div className="flex justify-between text-sm">
                    <span>Phí giao hàng</span>
                    <span>{formatPrice(order.shippingFee)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Tổng cộng</span>
                    <span className="text-green-700">{formatPrice(order.total + order.shippingFee)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  <MapPin className="h-3 w-3" />
                  {order.address}
                  <Phone className="h-3 w-3 ml-2" />
                  {order.phone}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{getPaymentMethodLabel(order.paymentMethod)}</span>
                  <div className="flex items-center gap-2">
                    {order.status === 'PENDING' && (
                      <Button variant="destructive" size="sm" onClick={() => handleCancel(order.id)}>
                        Hủy đơn
                      </Button>
                    )}
                    {order.status === 'DELIVERED' && !ratedOrderIds.has(order.id) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-700 border-green-200 hover:bg-green-50"
                        onClick={() => setRatingOrderId(order.id)}
                      >
                        <Star className="h-4 w-4 mr-1" />
                        Đánh giá
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Rating Dialog */}
      {ratingOrderId && (
        <RatingDialog
          orderId={ratingOrderId}
          order={orders.find(o => o.id === ratingOrderId)}
          open={!!ratingOrderId}
          onClose={() => setRatingOrderId(null)}
          onSubmit={handleRateSubmit}
        />
      )}
    </div>
  )
}

// ==================== RATING DIALOG ====================
function RatingDialog({
  orderId,
  order,
  open,
  onClose,
  onSubmit,
}: {
  orderId: string
  order: Order | undefined
  open: boolean
  onClose: () => void
  onSubmit: (orderId: string, productId: string, rating: number, comment: string) => void
}) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  // Reset form and set default product when dialog opens/closes
  const handleClose = () => {
    setRating(0)
    setComment('')
    setSelectedProduct('')
    onClose()
  }

  // Set default product when order data becomes available
  if (open && order?.items.length && !selectedProduct) {
    setSelectedProduct(order.items[0].productId)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) {
      toast.error('Vui lòng chọn số sao đánh giá')
      return
    }
    if (!selectedProduct) {
      toast.error('Vui lòng chọn sản phẩm để đánh giá')
      return
    }
    setSubmitting(true)
    await onSubmit(orderId, selectedProduct, rating, comment)
    setSubmitting(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
            Đánh giá đơn hàng
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {order && order.items.length > 1 && (
            <div className="space-y-2">
              <Label>Chọn sản phẩm để đánh giá</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn sản phẩm" />
                </SelectTrigger>
                <SelectContent>
                  {order.items.map((item) => (
                    <SelectItem key={item.productId} value={item.productId}>
                      {item.product.name} x{item.quantity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Đánh giá của bạn</Label>
            <StarPicker value={rating} onChange={setRating} />
            {rating > 0 && (
              <p className="text-xs text-muted-foreground">
                {rating === 1 && 'Rất không hài lòng'}
                {rating === 2 && 'Không hài lòng'}
                {rating === 3 && 'Bình thường'}
                {rating === 4 && 'Hài lòng'}
                {rating === 5 && 'Rất hài lòng'}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Nhận xét (tùy chọn)</Label>
            <Textarea
              placeholder="Chia sẻ trải nghiệm của bạn..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white" disabled={submitting || rating === 0}>
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang gửi...</> : 'Gửi đánh giá'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ==================== WISHLIST HEART BUTTON ====================
function WishlistHeartButton({ productId }: { productId: string }) {
  const [isWishlisted, setIsWishlisted] = useState(false)

  useEffect(() => {
    let cancelled = false
    const checkWishlist = async () => {
      try {
        const res = await fetch('/api/wishlist')
        if (res.ok && !cancelled) {
          const data = await res.json()
          const ids = (data.wishlistItems || []).map((w: { productId: string }) => w.productId)
          setIsWishlisted(ids.includes(productId))
        }
      } catch { /* ignore */ }
    }
    checkWishlist()
    return () => { cancelled = true }
  }, [productId])

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      if (isWishlisted) {
        // Find the wishlist item id to delete
        const res = await fetch('/api/wishlist')
        if (res.ok) {
          const data = await res.json()
          const item = (data.wishlistItems || []).find((w: { productId: string }) => w.productId === productId)
          if (item) {
            const delRes = await csrfFetch(`/api/wishlist/${item.id}`, { method: 'DELETE' })
            if (delRes.ok) {
              setIsWishlisted(false)
              toast.success('Đã xóa khỏi danh sách yêu thích')
            }
          }
        }
      } else {
        const res = await csrfFetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId }),
        })
        if (res.ok) {
          setIsWishlisted(true)
          toast.success('Đã thêm vào danh sách yêu thích ❤️')
        } else {
          const data = await res.json()
          if (data.error?.includes('đã có')) {
            setIsWishlisted(true)
          }
        }
      }
    } catch {
      toast.error('Lỗi khi cập nhật yêu thích')
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="h-8 w-8 p-0 shrink-0"
      onClick={handleToggle}
    >
      <Heart className={`h-4 w-4 transition-colors ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
    </Button>
  )
}

// ==================== WISHLIST TAB ====================
interface WishlistProduct {
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
  shop: { id: string; name: string; image?: string | null; rating: number }
  category: { id: string; name: string; slug: string }
}

interface WishlistItem {
  id: string
  productId: string
  createdAt: string
  product: WishlistProduct
}

function WishlistTab() {
  const { addToCart } = useAppStore()
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [imageLoadingMap, setImageLoadingMap] = useState<Record<string, boolean>>({})

  const fetchWishlist = useCallback(async () => {
    try {
      const res = await fetch('/api/wishlist')
      if (res.ok) {
        const data = await res.json()
        setWishlistItems(data.wishlistItems || [])
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      await fetchWishlist()
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [fetchWishlist])

  const handleRemove = async (wishlistItemId: string) => {
    try {
      const res = await csrfFetch(`/api/wishlist/${wishlistItemId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Đã xóa khỏi danh sách yêu thích')
        fetchWishlist()
      }
    } catch {
      toast.error('Không thể xóa')
    }
  }

  const handleAddToCart = async (productId: string) => {
    try {
      await addToCart(productId)
      toast.success('Đã thêm vào giỏ hàng 🛒')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể thêm vào giỏ hàng')
    }
  }

  const handleImageLoad = (productId: string) => {
    setImageLoadingMap(prev => ({ ...prev, [productId]: false }))
  }

  const handleImageStart = (productId: string) => {
    setImageLoadingMap(prev => ({ ...prev, [productId]: true }))
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="h-40 w-full" />
            <CardContent className="p-3">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Sản phẩm yêu thích ({wishlistItems.length})</h2>
      {wishlistItems.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-24 h-24 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
            <Heart className="h-11 w-11 text-red-300" />
          </div>
          <h3 className="text-lg font-bold mb-1">Chưa có sản phẩm yêu thích</h3>
          <p className="text-muted-foreground mb-4">Nhấn ❤️ trên sản phẩm để thêm vào danh sách</p>
          <Button variant="outline" className="text-green-700 border-green-200 hover:bg-green-50" onClick={() => useAppStore.getState().setTab('products')}>
            Khám phá sản phẩm
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {wishlistItems.map((item) => (
            <Card key={item.id} className="overflow-hidden group hover:shadow-xl hover:scale-[1.02] transition-all duration-300 border-0 shadow-sm">
              <div className="h-40 bg-muted flex items-center justify-center relative overflow-hidden">
                {imageLoadingMap[item.productId] !== false && item.product.image && (
                  <Skeleton className="absolute inset-0" />
                )}
                {item.product.image ? (
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${imageLoadingMap[item.productId] === false ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => handleImageLoad(item.productId)}
                    onError={() => handleImageLoad(item.productId)}
                    onLoadStart={() => handleImageStart(item.productId)}
                  />
                ) : (
                  <Package className="h-10 w-10 text-muted-foreground" />
                )}
                {/* Remove from wishlist button */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2 h-7 w-7 p-0 bg-white/80 hover:bg-white rounded-full shadow-sm"
                  onClick={() => handleRemove(item.id)}
                >
                  <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                </Button>
                {!item.product.inStock && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">Hết hàng</span>
                  </div>
                )}
              </div>
              <CardContent className="p-3">
                <h3 className="font-medium text-sm line-clamp-2 mb-1 min-h-[2.5rem]">{item.product.name}</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                  <Store className="h-3 w-3" />
                  {item.product.shop.name}
                </p>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-green-700 font-bold">{formatPrice(item.product.price)}</span>
                  {item.product.originalPrice && item.product.originalPrice > item.product.price && (
                    <span className="text-xs text-muted-foreground line-through">{formatPrice(item.product.originalPrice)}</span>
                  )}
                </div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <StarRating rating={item.product.rating} />
                    <span className="text-xs text-muted-foreground ml-0.5">{item.product.rating.toFixed(1)}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="w-full h-8 text-xs bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                  onClick={() => handleAddToCart(item.productId)}
                  disabled={!item.product.inStock}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Thêm vào giỏ
                </Button>
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
      <h2 className="text-xl font-bold mb-6">Hồ sơ cá nhân</h2>
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-green-500 to-emerald-600 relative" />
        <CardContent className="p-6 -mt-10 relative">
          <div className="flex items-end gap-4 mb-6">
            <div className="w-20 h-20 rounded-2xl bg-white shadow-lg flex items-center justify-center text-3xl font-bold text-green-700 border-4 border-white">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="pb-1">
              <h3 className="text-lg font-bold">{user.name}</h3>
              <Badge className="bg-green-100 text-green-700 border-green-200">Người mua</Badge>
            </div>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 rounded-xl bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Email</p>
                <p className="text-sm font-medium">{user.email}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Số điện thoại</p>
                <p className="text-sm font-medium">{user.phone || 'Chưa cập nhật'}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Địa chỉ</p>
                <p className="text-sm font-medium">{user.address || 'Chưa cập nhật'}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/50">
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
