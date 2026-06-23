'use client'
import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import LoginView from '@/components/zmarket/LoginView'

export default function LoginPage() {
  const { setView } = useAppStore()
  useEffect(() => {
    setView('login')
  }, [setView])
  return <LoginView />
}
