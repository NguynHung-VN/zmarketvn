import { describe, it, expect } from 'vitest'
import { calculateOrderTotal, formatVND } from '../../src/lib/money'

describe('Money Utility Tests', () => {
  describe('formatVND', () => {
    it('should format numbers correctly to VND currency string', () => {
      expect(formatVND(10000)).toBe('10.000đ')
      expect(formatVND(0)).toBe('0đ')
      expect(formatVND(1250350)).toBe('1.250.350đ')
    })
  })

  describe('calculateOrderTotal', () => {
    it('should calculate correct totals with default shipping and discount', () => {
      const items = [
        { price: 20000, quantity: 2 },
        { price: 15000, quantity: 1 }
      ]
      const result = calculateOrderTotal(items)
      expect(result.subtotal).toBe(55000)
      expect(result.shippingFee).toBe(0)
      expect(result.discount).toBe(0)
      expect(result.total).toBe(55000)
    })

    it('should include shipping fee and subtract discount correctly', () => {
      const items = [
        { price: 20000, quantity: 2 },
      ]
      const result = calculateOrderTotal(items, 15000, 5000)
      expect(result.subtotal).toBe(40000)
      expect(result.shippingFee).toBe(15000)
      expect(result.discount).toBe(5000)
      expect(result.total).toBe(50000) // 40000 + 15000 - 5000 = 50000
    })

    it('should guarantee total is never negative', () => {
      const items = [
        { price: 10000, quantity: 1 },
      ]
      const result = calculateOrderTotal(items, 0, 20000)
      expect(result.subtotal).toBe(10000)
      expect(result.total).toBe(0) // 10000 - 20000 = -10000 -> 0
    })
  })
})
