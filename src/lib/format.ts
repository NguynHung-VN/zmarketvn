export function formatPrice(price: number): string {
  return new Intl.NumberFormat('vi-VN').format(price) + 'đ'
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'Chờ xác nhận',
    CONFIRMED: 'Đã xác nhận',
    PREPARING: 'Đang chuẩn bị',
    SHIPPING: 'Đang giao hàng',
    DELIVERED: 'Đã giao',
    CANCELLED: 'Đã hủy',
  }
  return map[status] || status
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    CONFIRMED: 'bg-blue-100 text-blue-800',
    PREPARING: 'bg-purple-100 text-purple-800',
    SHIPPING: 'bg-orange-100 text-orange-800',
    DELIVERED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
  }
  return map[status] || 'bg-gray-100 text-gray-800'
}

export function getPaymentStatusLabel(status: string): string {
  const map: Record<string, string> = {
    UNPAID: 'Chưa thanh toán',
    PAID: 'Đã thanh toán',
    REFUNDED: 'Đã hoàn tiền',
  }
  return map[status] || status
}

export function getPaymentStatusColor(status: string): string {
  const map: Record<string, string> = {
    UNPAID: 'bg-red-100 text-red-800',
    PAID: 'bg-green-100 text-green-800',
    REFUNDED: 'bg-orange-100 text-orange-800',
  }
  return map[status] || 'bg-gray-100 text-gray-800'
}

export function getRoleLabel(role: string): string {
  const map: Record<string, string> = {
    BUYER: 'Người mua',
    SELLER: 'Tiểu thương',
    SHIPPER: 'Shipper',
    ADMIN: 'Quản trị viên',
  }
  return map[role] || role
}

export function getRoleColor(role: string): string {
  const map: Record<string, string> = {
    BUYER: 'bg-emerald-100 text-emerald-800',
    SELLER: 'bg-amber-100 text-amber-800',
    SHIPPER: 'bg-sky-100 text-sky-800',
    ADMIN: 'bg-rose-100 text-rose-800',
  }
  return map[role] || 'bg-gray-100 text-gray-800'
}

export function getPaymentMethodLabel(method: string): string {
  const map: Record<string, string> = {
    COD: 'Thanh toán khi nhận hàng',
    BANKING: 'Chuyển khoản',
    EWALLET: 'Ví điện tử',
  }
  return map[method] || method
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function renderStars(rating: number): string {
  const full = Math.floor(rating)
  const half = rating % 1 >= 0.5 ? 1 : 0
  const empty = 5 - full - half
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty)
}
