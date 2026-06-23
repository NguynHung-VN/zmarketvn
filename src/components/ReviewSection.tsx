// src/components/ReviewSection.tsx
'use client'
import { useState, useEffect } from 'react'
import { Star, Loader2 } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { csrfFetch } from '@/lib/csrf-fetch'

interface Review {
  id: string
  orderId?: string
  rating: number
  comment?: string | null
  createdAt: string | Date
  user: {
    name: string
    avatar?: string | null
  }
}

interface OrderItem {
  id: string
  productId: string
  quantity: number
}

interface Order {
  id: string
  status: string
  items: OrderItem[]
}

export function ReviewSection({ productId, reviews }: { productId: string; reviews: Review[] }) {
  const { user } = useAppStore()
  const router = useRouter()
  const [eligibleOrder, setEligibleOrder] = useState<Order | null>(null)
  
  // Form states
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Fetch orders to check eligibility
  useEffect(() => {
    if (!user) return
    let active = true
    
    fetch('/api/orders')
      .then((res) => (res.ok ? res.json() : { orders: [] }))
      .then((data) => {
        if (!active) return
        const userOrders: Order[] = data.orders || []
        
        // Find delivered orders that contain this product
        const deliveredWithProduct = userOrders.filter(
          (o) => o.status === 'DELIVERED' && o.items.some((item) => item.productId === productId)
        )
        
        // Find one order that hasn't been reviewed yet
        const unreviewed = deliveredWithProduct.find(
          (o) => !reviews.some((r) => r.orderId === o.id)
        )
        
        if (unreviewed) {
          setEligibleOrder(unreviewed)
        } else {
          setEligibleOrder(null)
        }
      })
      .catch(() => { /* ignore */ })

    return () => {
      active = false
    }
  }, [user, productId, reviews])

  const averageRating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0

  const ratingCounts = [0, 0, 0, 0, 0] // 1..5 stars
  reviews.forEach((r) => {
    if (r.rating >= 1 && r.rating <= 5) {
      ratingCounts[r.rating - 1]++
    }
  })

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eligibleOrder) return
    setSubmitting(true)
    try {
      const res = await csrfFetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          orderId: eligibleOrder.id,
          rating,
          comment: comment.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Lỗi gửi đánh giá')

      toast.success('Cảm ơn bạn đã đánh giá sản phẩm!')
      setComment('')
      setRating(5)
      setEligibleOrder(null)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Lỗi server')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-8 border-t pt-8 space-y-8">
      <div>
        <h2 className="text-xl font-bold mb-4">Đánh giá sản phẩm ({reviews.length})</h2>
        
        <div className="grid md:grid-cols-3 gap-6 mb-6 items-center p-6 bg-muted/20 rounded-2xl border">
          <div className="text-center">
            <div className="text-4xl font-extrabold text-green-600 mb-1">
              {averageRating ? averageRating.toFixed(1) : '0.0'}
            </div>
            <div className="flex justify-center mb-1 text-yellow-400">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`h-5 w-5 ${
                    s <= Math.round(averageRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-gray-500">Đánh giá trung bình</p>
          </div>

          <div className="md:col-span-2 space-y-2">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = ratingCounts[stars - 1]
              const percentage = reviews.length ? (count / reviews.length) * 100 : 0
              return (
                <div key={stars} className="flex items-center gap-3 text-sm">
                  <span className="w-12 font-semibold flex items-center gap-0.5">
                    {stars} <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  </span>
                  <div className="flex-1 h-2 bg-gray-150 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-gray-500 font-medium">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Form viết đánh giá */}
      {eligibleOrder && (
        <form onSubmit={handleSubmitReview} className="p-6 bg-green-50/20 border border-green-100 rounded-2xl space-y-4 animate-fadeIn">
          <div className="space-y-1">
            <h3 className="font-bold text-base text-green-800">Đánh giá sản phẩm đã mua</h3>
            <p className="text-xs text-green-700/75">Bạn đã nhận được sản phẩm này trong một đơn hàng thành công. Hãy để lại nhận xét nhé!</p>
          </div>

          <div className="space-y-1.5">
            <Label className="font-semibold text-sm">Số sao đánh giá *</Label>
            <div className="flex gap-1.5 text-gray-300">
              {[1, 2, 3, 4, 5].map((s) => {
                const isActive = hoverRating !== null ? s <= hoverRating : s <= rating
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    onMouseEnter={() => setHoverRating(s)}
                    onMouseLeave={() => setHoverRating(null)}
                    className="cursor-pointer transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        isActive ? 'fill-yellow-400 text-yellow-400 animate-pulse' : 'text-gray-300'
                      }`}
                    />
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="font-semibold text-sm">Bình luận, nhận xét</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này (độ tươi ngon, đóng gói, giao hàng...)"
              rows={3}
              maxLength={1000}
            />
          </div>

          <Button type="submit" disabled={submitting} className="bg-green-600 hover:bg-green-700 text-white font-semibold">
            {submitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang gửi...</>
            ) : (
              'Gửi đánh giá'
            )}
          </Button>
        </form>
      )}

      {/* Danh sách các review hiện tại */}
      <div className="space-y-5">
        <h3 className="font-bold text-lg text-gray-900 border-b pb-2">Nhận xét từ khách hàng</h3>
        {reviews.length === 0 ? (
          <p className="text-gray-500 italic text-center py-8">Chưa có đánh giá nào cho sản phẩm này.</p>
        ) : (
          reviews.map((r) => (
            <div key={r.id} className="border-b pb-5 last:border-0 last:pb-0 flex gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-150 flex items-center justify-center font-bold text-gray-600 text-sm overflow-hidden flex-shrink-0">
                {r.user.avatar ? (
                  <img src={r.user.avatar} alt={r.user.name} className="w-full h-full object-cover" />
                ) : (
                  r.user.name.charAt(0)
                )}
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-gray-900">{r.user.name}</div>
                  <span className="text-xs text-gray-400 font-medium">
                    {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <div className="flex text-yellow-400">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-3 w-3 ${
                        s <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                {r.comment && <p className="text-gray-700 text-sm mt-2 leading-relaxed">{r.comment}</p>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
