'use client'
import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import AdminDashboard from '@/components/zmarket/AdminDashboard'

export default function AdminPage() {
  const { setView, checkAuth } = useAppStore()
  useEffect(() => {
    checkAuth()
    setView('admin-dashboard')
  }, [setView, checkAuth])
  return <AdminDashboard />
}
