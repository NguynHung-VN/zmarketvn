'use client'
import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import RegisterView from '@/components/zmarket/RegisterView'

export default function RegisterPage() {
  const { setView } = useAppStore()
  useEffect(() => {
    setView('register')
  }, [setView])
  return <RegisterView />
}
