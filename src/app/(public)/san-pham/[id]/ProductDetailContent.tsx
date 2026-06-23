// src/app/(public)/san-pham/[id]/ProductDetailContent.tsx
'use client'
import { useState } from 'react'
import { formatVND } from '@/lib/money'
import { AddToCartButton } from '@/components/AddToCartButton'
import { Badge } from '@/components/ui/badge'

interface Variant {
  id: string
  name: string
  price: number
  stockQuantity: number
  sku: string | null
}

interface Shop {
  id: string
  name: string
  image: string | null
  address: string
  phone: string | null
  rating: number
}

interface Review {
  id: string
  rating: number
  comment: string | null
  createdAt: string
  user: {
    id: string
    name: string
    avatar: string | null
  }
}

interface Product {
  id: string
  name: string
  description: string | null
  longDescription: string | null
  price: number
  originalPrice: number | null
  unit: string
  stockQuantity: number
  lowStockThreshold: number
  sku: string | null
  images: string[]
  weightGram: number | null
  origin: string | null
  storageInfo: string | null
  rating: number
  reviewCount: number
  soldCount: number
  shop: Shop
  variants: Variant[]
  reviews: Review[]
}

export default function ProductDetailContent({ product }: { product: Product }) {
  const [activeImage, setActiveImage] = useState(product.images[0] || '/images/placeholder.jpg')
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null)

  const currentPrice = selectedVariant ? selectedVariant.price : product.price
  const currentStock = selectedVariant ? selectedVariant.stockQuantity : product.stockQuantity
  const currentUnit = product.unit

  const hasDiscount = product.originalPrice && product.originalPrice > currentPrice
  const originalPriceDisplay = product.originalPrice

  return (
    <div className="grid md:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border shadow-sm">
      {/* Gallery ảnh */}
      <div className="space-y-4">
        <div className="aspect-square rounded-xl overflow-hidden bg-gray-50 border relative group">
          <img src={activeImage} alt={product.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
          {hasDiscount && (
            <Badge className="absolute top-3 left-3 bg-red-600 text-white border-none text-xs font-bold px-2.5 py-1">
              GIẢM GIÁ
            </Badge>
          )}
        </div>
        {product.images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {product.images.map((url, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(url)}
                className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 cursor-pointer ${
                  activeImage === url ? 'border-green-600 ring-2 ring-green-100' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <img src={url} alt={`${product.name} ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Thông tin sản phẩm */}
      <div className="space-y-5 flex flex-col justify-between">
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-2">{product.name}</h1>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="font-semibold text-amber-500 flex items-center gap-0.5">
                ⭐ {product.rating.toFixed(1)}
              </span>
              <span>•</span>
              <span>{product.reviewCount} đánh giá</span>
              <span>•</span>
              <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">Đã bán {product.soldCount || 0}</span>
            </div>
          </div>

          <div className="flex items-baseline gap-3 p-4 bg-green-50/50 rounded-xl border border-green-100/50">
            <span className="text-3xl font-black text-green-700">{formatVND(currentPrice)}</span>
            {hasDiscount && originalPriceDisplay && (
              <span className="text-base text-gray-400 line-through font-medium">
                {formatVND(originalPriceDisplay)}
              </span>
            )}
          </div>

          {/* Xuất xứ & Hướng dẫn bảo quản */}
          <div className="text-sm space-y-2 border-b pb-4">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-24">Đơn vị:</span>
              <span className="font-medium">{currentUnit}</span>
            </div>
            {product.origin && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-24">Xuất xứ:</span>
                <span className="font-medium">{product.origin}</span>
              </div>
            )}
            {product.sku && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-24">Mã sản phẩm:</span>
                <span className="font-medium font-mono text-xs">{selectedVariant?.sku || product.sku}</span>
              </div>
            )}
          </div>

          {/* Phân loại biến thể */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="font-semibold text-sm text-gray-800">Chọn Phân loại:</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedVariant(null)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    selectedVariant === null
                      ? 'bg-green-50 border-green-600 text-green-700 font-bold ring-1 ring-green-600'
                      : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                  }`}
                >
                  Mặc định — {formatVND(product.price)}
                </button>
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      selectedVariant?.id === v.id
                        ? 'bg-green-50 border-green-600 text-green-700 font-bold ring-1 ring-green-600'
                        : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    {v.name} — {formatVND(v.price)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Trạng thái tồn kho */}
          <div className="flex items-center gap-2 text-sm border-t pt-4">
            <span className="text-muted-foreground w-24">Tình trạng:</span>
            {currentStock <= 0 ? (
              <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded text-xs">Hết hàng</span>
            ) : currentStock <= product.lowStockThreshold ? (
              <span className="text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded text-xs">
                Chỉ còn {currentStock} {currentUnit}
              </span>
            ) : (
              <span className="text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded text-xs">
                Còn {currentStock} {currentUnit}
              </span>
            )}
          </div>

          {product.storageInfo && (
            <div className="text-xs bg-amber-50/50 p-3 rounded-lg border border-amber-100/50 text-amber-800">
              <span className="font-bold">💡 Bảo quản:</span> {product.storageInfo}
            </div>
          )}

          {product.description && (
            <div className="space-y-1.5 border-t pt-4">
              <h3 className="font-semibold text-sm text-gray-800">Mô tả sản phẩm:</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
            </div>
          )}

          {product.longDescription && (
            <div className="space-y-1.5 border-t pt-4">
              <h3 className="font-semibold text-sm text-gray-800">Thông tin chi tiết:</h3>
              <div
                className="prose prose-sm max-w-none text-sm text-gray-600 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: product.longDescription }}
              />
            </div>
          )}
        </div>

        <div className="space-y-4 border-t pt-4">
          <AddToCartButton
            productId={product.id}
            variantId={selectedVariant?.id || null}
            disabled={currentStock <= 0}
          />

          {/* Sạp hàng liên kết */}
          <div className="p-3 bg-muted/30 rounded-xl border flex items-center justify-between">
            <a href={`/sap-hang/${product.shop.id}`} className="flex items-center gap-3 hover:underline">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border">
                {product.shop.image ? (
                  <img src={product.shop.image} alt={product.shop.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-sm">
                    {product.shop.name.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <div className="font-bold text-sm text-gray-900">{product.shop.name}</div>
                <div className="text-xs text-muted-foreground">⭐ {product.shop.rating.toFixed(1)} · Tiểu thương uy tín</div>
              </div>
            </a>
            <a
              href={`/sap-hang/${product.shop.id}`}
              className="text-xs font-bold text-green-700 border border-green-600 bg-white hover:bg-green-50 px-3 py-1.5 rounded-lg"
            >
              Ghé sạp
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
