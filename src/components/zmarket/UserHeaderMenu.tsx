'use client'

import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { translations } from '@/lib/translations'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User, Settings, LogOut, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function UserHeaderMenu() {
  const { user, language, setTab } = useAppStore()
  const t = translations[language]
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!user) return null

  const handleNavigate = (tab: string) => {
    setTab(tab)
    setOpen(false)
  }

  const handleLogout = () => {
    setOpen(false)
    useAppStore.getState().logout()
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger: User avatar + name */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-muted/60 transition-all duration-200 group"
      >
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold overflow-hidden shadow-sm">
          {user.avatar ? (
            <Avatar className="w-full h-full rounded-none">
              <AvatarImage src={user.avatar} className="object-cover" />
              <AvatarFallback className="rounded-none text-xs bg-green-500 text-white">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : (
            user.name.charAt(0).toUpperCase()
          )}
        </div>
        <span className="text-sm font-medium text-foreground/80 hidden sm:block max-w-[120px] truncate">
          {user.name}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 hidden sm:block ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-1.5 w-56 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-muted/50 py-1.5 z-[100] overflow-hidden"
          >
            {/* User info header */}
            <div className="px-4 py-3 border-b border-muted/40">
              <p className="text-sm font-semibold text-foreground/90 truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>

            {/* Menu items */}
            <div className="py-1">
              <button
                onClick={() => handleNavigate('profile')}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/80 hover:bg-muted/50 hover:text-foreground transition-colors"
              >
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{t.profile}</span>
              </button>
              <button
                onClick={() => handleNavigate('settings')}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/80 hover:bg-muted/50 hover:text-foreground transition-colors"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{t.settings}</span>
              </button>
            </div>

            <div className="border-t border-muted/40 py-1">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="font-medium">{t.logout}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
