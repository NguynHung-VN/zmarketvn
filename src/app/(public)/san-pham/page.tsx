'use client'
import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import BuyerDashboard from '@/components/zmarket/BuyerDashboard'

export default function ProductsPage() {
  const { setView, setTab, checkAuth } = useAppStore()
  useEffect(() => {
    checkAuth()
    setView('buyer-dashboard')
    setTab('products')
  }, [setView, setTab, checkAuth])
  return <BuyerDashboard />
}
