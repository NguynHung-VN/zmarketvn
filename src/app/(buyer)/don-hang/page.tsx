'use client'
import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import BuyerDashboard from '@/components/zmarket/BuyerDashboard'

export default function OrdersPage() {
  const { setView, setTab, checkAuth } = useAppStore()
  useEffect(() => {
    checkAuth()
    setView('buyer-dashboard')
    setTab('orders')
  }, [setView, setTab, checkAuth])
  return <BuyerDashboard />
}
