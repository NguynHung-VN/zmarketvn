'use client'
import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import SellerDashboard from '@/components/zmarket/SellerDashboard'

export default function SellerPage() {
  const { setView, checkAuth } = useAppStore()
  useEffect(() => {
    checkAuth()
    setView('seller-dashboard')
  }, [setView, checkAuth])
  return <SellerDashboard />
}
