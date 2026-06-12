'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import LandingView from '@/components/zmarket/LandingView'
import LoginView from '@/components/zmarket/LoginView'
import RegisterView from '@/components/zmarket/RegisterView'
import BuyerDashboard from '@/components/zmarket/BuyerDashboard'
import SellerDashboard from '@/components/zmarket/SellerDashboard'
import AdminDashboard from '@/components/zmarket/AdminDashboard'
import ShipperDashboard from '@/components/zmarket/ShipperDashboard'

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

export default function Home() {
  const { currentView, checkAuth, setView } = useAppStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Support URL-based navigation: ?view=login or ?view=register
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const view = params.get('view')
    if (view && ['login', 'register', 'landing'].includes(view)) {
      setView(view)
      // Clean URL without reloading
      window.history.replaceState({}, '', '/')
    }
  }, [setView])

  const getViewComponent = () => {
    switch (currentView) {
      case 'login':
        return <LoginView />
      case 'register':
        return <RegisterView />
      case 'buyer-dashboard':
        return <BuyerDashboard />
      case 'seller-dashboard':
        return <SellerDashboard />
      case 'admin-dashboard':
        return <AdminDashboard />
      case 'shipper-dashboard':
        return <ShipperDashboard />
      default:
        return <LandingView />
    }
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentView}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.25, ease: 'easeInOut' }}
      >
        {getViewComponent()}
      </motion.div>
    </AnimatePresence>
  )
}
