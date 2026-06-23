// src/app/(buyer)/thanh-toan/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import { formatVND } from '@/lib/money'

export default function CheckoutPage() {
  const router = useRouter()
  const { cart, isLoading, fetchCart } = useAppStore()
  const [form, setForm] = useState({
    shippingName: '',
    shippingPhone: '',
    shippingAddress: '',
    paymentMethod: 'COD' as 'COD' | 'VNPAY',
    note: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchCart()
  }, [fetchCart])

  if (isLoading) return <div className="p-8 text-center">Đang tải...</div>
  if (!cart || cart.length === 0) {
    return <div className="p-8 text-center">Giỏ hàng trống. <a href="/san-pham" className="text-green-600 underline">Mua sắm ngay</a></div>
  }

  const subtotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0)
  const shippingFee = 15000
  const total = subtotal + shippingFee

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
          ...form,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Lỗi đặt hàng')
      if (data.paymentUrl) {
        // Redirect sang VNPay
        window.location.href = data.paymentUrl
      } else {
        // COD — về trang đơn hàng
        router.push(`/don-hang/${data.order.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl font-bold mb-6">Thanh toán</h1>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Họ tên người nhận *</label>
          <input
            type="text" required minLength={2}
            value={form.shippingName}
            onChange={(e) => setForm({ ...form, shippingName: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Số điện thoại *</label>
          <input
            type="tel" required pattern="0\d{9,10}"
            value={form.shippingPhone}
            onChange={(e) => setForm({ ...form, shippingPhone: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Địa chỉ giao hàng *</label>
          <textarea
            required minLength={5}
            value={form.shippingAddress}
            onChange={(e) => setForm({ ...form, shippingAddress: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Phương thức thanh toán *</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 border rounded p-3 cursor-pointer">
              <input type="radio" checked={form.paymentMethod === 'COD'} onChange={() => setForm({ ...form, paymentMethod: 'COD' })} />
              <span>💵 Thanh toán khi nhận hàng (COD)</span>
            </label>
            <label className="flex items-center gap-2 border rounded p-3 cursor-pointer">
              <input type="radio" checked={form.paymentMethod === 'VNPAY'} onChange={() => setForm({ ...form, paymentMethod: 'VNPAY' })} />
              <span>🏦 VNPay (thẻ ATM / QR / ví)</span>
            </label>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Ghi chú (tuỳ chọn)</label>
          <input
            type="text" maxLength={500}
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {/* Tóm tắt tiền */}
        <div className="border-t pt-4 space-y-1">
          <div className="flex justify-between"><span>Tiền hàng:</span><span>{formatVND(subtotal)}</span></div>
          <div className="flex justify-between"><span>Phí giao hàng:</span><span>{formatVND(shippingFee)}</span></div>
          <div className="flex justify-between font-bold text-lg pt-2 border-t"><span>Tổng cộng:</span><span className="text-green-600">{formatVND(total)}</span></div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-green-600 text-white py-3 rounded font-bold disabled:opacity-50"
        >
          {submitting ? 'Đang xử lý...' : form.paymentMethod === 'COD' ? 'Đặt hàng' : 'Thanh toán qua VNPay'}
        </button>
      </form>
    </div>
  )
}
