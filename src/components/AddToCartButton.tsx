'use client'
import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { ShoppingCart, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function AddToCartButton({ productId, variantId, disabled }: { productId: string; variantId?: string | null; disabled?: boolean }) {
  const { addToCart, user } = useAppStore()
  const [loading, setLoading] = useState(false)

  const handleAdd = async () => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để thêm vào giỏ hàng')
      return
    }
    setLoading(true)
    try {
      await addToCart(productId, 1, variantId)
      toast.success('Đã thêm vào giỏ hàng!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi thêm vào giỏ hàng')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleAdd}
      disabled={disabled || loading}
      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <ShoppingCart className="mr-2 h-4 w-4" />
      )}
      Thêm vào giỏ hàng
    </Button>
  )
}
