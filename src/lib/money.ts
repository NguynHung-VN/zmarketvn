/** Format VND sang chuỗi hiển thị: 70000 -> "70.000đ" */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ'
}

/** Parse chuỗi tiền về số nguyên: "70.000đ" -> 70000 */
export function parseVND(s: string): number {
  return parseInt(s.replace(/[^\d]/g, ''), 10) || 0
}

/**
 * Tính tổng đơn hàng — CHỈ chạy ở server.
 * subtotal = sum(item.price * item.quantity)
 * total = subtotal + shippingFee - discount
 */
export interface OrderCalculation {
  subtotal: number
  shippingFee: number
  discount: number
  total: number
}

export function calculateOrderTotal(
  items: { price: number; quantity: number }[],
  shippingFee: number = 0,
  discount: number = 0,
): OrderCalculation {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const total = subtotal + shippingFee - discount
  // Đảm bảo không âm
  return {
    subtotal: Math.max(0, subtotal),
    shippingFee: Math.max(0, shippingFee),
    discount: Math.max(0, discount),
    total: Math.max(0, total),
  }
}

/** Tính phí ship cơ bản theo trọng lượng (ví dụ) */
export function calculateShippingFee(weightGram: number, distanceKm: number = 5): number {
  const baseFee = 15000          // phí nền 15.000đ
  const perKgFee = 2000          // +2.000đ/kg
  const perKmFee = 1000          // +1.000đ/km (simplified)
  const weightKg = Math.ceil(weightGram / 1000)
  return baseFee + weightKg * perKgFee + Math.ceil(distanceKm) * perKmFee
}
