// src/app/(seller)/seller/kho/page.tsx
'use client'
import { useState, useEffect } from 'react'

interface StockProduct {
  id: string
  name: string
  unit: string
  stockQuantity: number
  lowStockThreshold: number
  sku: string | null
  variants: { id: string; name: string; stockQuantity: number }[]
}

export default function InventoryPage() {
  const [products, setProducts] = useState<StockProduct[]>([])
  const [filter, setFilter] = useState<'all' | 'low'>('all')
  const [loading, setLoading] = useState(true)
  const [importModal, setImportModal] = useState<{ productId: string; name: string } | null>(null)
  const [importQty, setImportQty] = useState(0)

  useEffect(() => {
    setTimeout(() => {
      setLoading(true)
    }, 0)
    fetch(`/api/seller/inventory${filter === 'low' ? '?filter=low-stock' : ''}`)
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []))
      .finally(() => setLoading(false))
  }, [filter])

  async function handleImport() {
    if (!importModal || importQty <= 0) return
    const res = await fetch('/api/seller/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: importModal.productId, quantity: importQty }),
    })
    if (res.ok) {
      setImportModal(null)
      setImportQty(0)
      // Reload
      fetch(`/api/seller/inventory${filter === 'low' ? '?filter=low-stock' : ''}`)
        .then((r) => r.json())
        .then((d) => setProducts(d.products || []))
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Quản lý kho</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded cursor-pointer ${filter === 'all' ? 'bg-green-600 text-white' : 'border'}`}
          >Tất cả</button>
          <button
            onClick={() => setFilter('low')}
            className={`px-3 py-1 rounded cursor-pointer ${filter === 'low' ? 'bg-red-600 text-white' : 'border'}`}
          >Sắp hết</button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Đang tải...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-8 text-gray-500">Không có sản phẩm</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="border-b">
              <tr>
                <th className="text-left py-2 font-semibold">Sản phẩm</th>
                <th className="text-right font-semibold">Tồn kho</th>
                <th className="text-right font-semibold">Ngưỡng cảnh báo</th>
                <th className="text-right font-semibold">Trạng thái</th>
                <th className="text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b hover:bg-muted/5">
                  <td className="py-3">
                    <div className="font-medium">{p.name}</div>
                    {p.sku && <div className="text-xs text-gray-400">SKU: {p.sku}</div>}
                    {p.variants.map((v) => (
                      <div key={v.id} className="text-xs text-gray-500">{v.name}: {v.stockQuantity}</div>
                    ))}
                  </td>
                  <td className="text-right font-medium">{p.stockQuantity} {p.unit}</td>
                  <td className="text-right text-gray-500">{p.lowStockThreshold}</td>
                  <td className="text-right">
                    {p.stockQuantity <= 0 ? (
                      <span className="text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded text-xs">Hết hàng</span>
                    ) : p.stockQuantity <= p.lowStockThreshold ? (
                      <span className="text-orange-600 font-semibold bg-orange-50 px-2 py-0.5 rounded text-xs">Sắp hết</span>
                    ) : (
                      <span className="text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded text-xs">Đủ hàng</span>
                    )}
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() => { setImportModal({ productId: p.id, name: p.name }); setImportQty(0) }}
                      className="text-green-600 hover:underline text-sm font-semibold cursor-pointer"
                    >+ Nhập kho</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal nhập kho */}
      {importModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-lg border">
            <h2 className="text-lg font-bold mb-2">Nhập kho: {importModal.name}</h2>
            <input
              type="number" min={1} value={importQty || ''}
              onChange={(e) => setImportQty(parseInt(e.target.value, 10) || 0)}
              className="w-full border rounded px-3 py-2 mb-4"
              placeholder="Số lượng nhập"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setImportModal(null)} className="px-4 py-2 border rounded cursor-pointer hover:bg-gray-50">Huỷ</button>
              <button onClick={handleImport} disabled={importQty <= 0} className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50 cursor-pointer hover:bg-green-700">Xác nhận</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
