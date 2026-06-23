'use client'
import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import BuyerDashboard from '@/components/zmarket/BuyerDashboard'

export default function CartPage() {
  const { setView, setTab, checkAuth } = useAppStore()
  useEffect(() => {
    checkAuth()
    setView('buyer-dashboard')
    setTab('cart')
  }, [setView, setTab, checkAuth])
  return <BuyerDashboard />
}
