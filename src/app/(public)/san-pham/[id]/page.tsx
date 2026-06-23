import { notFound } from 'next/navigation'
import { getProductDetail } from '@/modules/catalog/service'
import { formatVND } from '@/lib/money'
import { ReviewSection } from '@/components/ReviewSection'
import ProductDetailContent from './ProductDetailContent'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  try {
    const product = await getProductDetail(id)
    return {
      title: `${product.name} — ${formatVND(product.price)} | Z-Market`,
      description: product.description || `Mua ${product.name} tươi ngon giao tận nơi`,
      openGraph: {
        title: product.name,
        description: product.description || '',
        images: product.images.map((url) => ({ url, width: 800, height: 600 })),
        type: 'website',
      },
    }
  } catch {
    return { title: 'Sản phẩm không tìm thấy | Z-Market' }
  }
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let product
  try {
    product = await getProductDetail(id)
  } catch {
    notFound()
  }

  // Map reviews correctly for the review section
  const mappedReviews = (product.reviews || []).map((r) => ({
    id: r.id,
    orderId: r.orderId,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt.toISOString(),
    user: {
      id: r.user.id,
      name: r.user.name,
      avatar: r.user.avatar || null,
    },
  }))

  const mappedProduct = {
    ...product,
    reviews: mappedReviews,
    variants: (product.variants || []).map((v) => ({
      id: v.id,
      name: v.name,
      price: v.price,
      stockQuantity: v.stockQuantity,
      sku: v.sku,
    })),
    shop: {
      id: product.shop.id,
      name: product.shop.name,
      image: product.shop.image,
      address: product.shop.address,
      phone: product.shop.phone,
      rating: product.shop.rating,
    },
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      <ProductDetailContent product={mappedProduct} />
      
      {/* Đánh giá */}
      <ReviewSection productId={product.id} reviews={mappedReviews} />
    </div>
  )
}
