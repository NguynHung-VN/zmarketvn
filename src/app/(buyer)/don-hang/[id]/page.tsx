'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { formatVND } from '@/lib/money'
import { getStatusLabel, getStatusColor, getPaymentStatusLabel, getPaymentStatusColor, formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Loader2, FileText, Phone, MapPin } from 'lucide-react'
import { toast } from 'sonner'

interface OrderItem {
  id: string
  quantity: number
  price: number
  product: {
    id: string
    name: string
    image?: string | null
    unit: string
  }
}

interface OrderDetail {
  id: string
  status: string
  subtotal: number
  total: number
  shippingFee: number
  address: string
  phone: string
  note?: string | null
  paymentMethod: string
  paymentStatus: string
  createdAt: string
  buyer: { name: string; phone: string }
  shop: { name: string; phone?: string | null }
  shipper?: { name: string; phone: string } | null
  items: OrderItem[]
}

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!id) return
    setTimeout(() => {
      setLoading(true)
    }, 0)
    fetch(`/api/orders/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Không thể tải thông tin đơn hàng')
        return r.json()
      })
      .then((d) => setOrder(d.order))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-green-600 mb-2" />
        <p className="text-gray-500">Đang tải chi tiết đơn hàng...</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-20">
        <h3 className="text-lg font-bold mb-2">Đơn hàng không tồn tại</h3>
        <Button onClick={() => router.push('/don-hang')} variant="outline">
          Quay lại đơn hàng
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 bg-white rounded-xl shadow-sm border mt-8">
      <div className="flex items-center gap-2 mb-6">
        <Button onClick={() => router.push('/don-hang')} variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-1" /> Quay lại
        </Button>
        <span className="text-sm text-gray-500">Mã đơn: #{order.id}</span>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold">Chi tiết đơn hàng</h1>
        <div className="flex gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
            {getStatusLabel(order.status)}
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPaymentStatusColor(order.paymentStatus)}`}>
            {getPaymentStatusLabel(order.paymentStatus)}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <Card className="border-0 bg-muted/20">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">Địa chỉ giao hàng</p>
                <p className="text-sm text-gray-600">{order.buyer.name} - {order.phone}</p>
                <p className="text-sm text-gray-500">{order.address}</p>
              </div>
            </div>
            {order.note && (
              <div className="text-sm border-t pt-2 mt-2">
                <span className="font-semibold text-gray-700">Ghi chú:</span> <span className="text-gray-600">{order.note}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <div>
          <h3 className="font-semibold text-sm mb-3">Sản phẩm từ sạp {order.shop.name}</h3>
          <div className="divide-y border rounded-lg bg-white overflow-hidden">
            {order.items.map((item) => (
              <div key={item.id} className="flex gap-3 p-3">
                <div className="w-16 h-16 rounded bg-gray-50 overflow-hidden flex-shrink-0">
                  {item.product.image ? (
                    <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">🖼️</div>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold">{item.product.name}</h4>
                  <p className="text-xs text-gray-500">Số lượng: {item.quantity} {item.product.unit}</p>
                  <p className="text-sm font-semibold text-green-600 mt-1">{formatVND(item.price)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border rounded-lg p-4 bg-muted/10 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Tiền hàng:</span>
            <span>{formatVND(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Phí giao hàng:</span>
            <span>{formatVND(order.shippingFee)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold text-base">
            <span>Tổng cộng:</span>
            <span className="text-green-700">{formatVND(order.total)}</span>
          </div>
        </div>

        <div className="text-xs text-gray-400 text-center pt-4">
          Đặt lúc: {formatDateTime(order.createdAt)}
        </div>
      </div>
    </div>
  )
}
