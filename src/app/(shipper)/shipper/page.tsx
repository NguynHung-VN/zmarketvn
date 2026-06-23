'use client'
import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import ShipperDashboard from '@/components/zmarket/ShipperDashboard'

export default function ShipperPage() {
  const { setView, checkAuth } = useAppStore()
  useEffect(() => {
    checkAuth()
    setView('shipper-dashboard')
  }, [setView, checkAuth])
  return <ShipperDashboard />
}
