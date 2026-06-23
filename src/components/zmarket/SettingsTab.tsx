'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { translations } from '@/lib/translations'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Globe, Bell, Shield, Info, ChevronRight, Mail,
  Smartphone, Package, Gift, FileText, ExternalLink
} from 'lucide-react'
import TermsModal from './TermsModal'

export default function SettingsTab() {
  const { language, setLanguage } = useAppStore()
  const t = translations[language]

  const [pushEnabled, setPushEnabled] = useState(true)
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [orderUpdates, setOrderUpdates] = useState(true)
  const [promotions, setPromotions] = useState(false)
  const [showTerms, setShowTerms] = useState(false)

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-foreground/90">{t.settings_title}</h2>

      {/* Language Section */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Card className="border-0 shadow-lg overflow-hidden bg-white/80 backdrop-blur-md rounded-2xl">
          <CardContent className="p-0">
            <div className="px-5 py-4 flex items-center gap-3 border-b border-muted/40">
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                <Globe className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground/90">{t.settings_language}</p>
                <p className="text-xs text-muted-foreground">{t.settings_language_desc}</p>
              </div>
            </div>
            <div className="px-5 py-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setLanguage('vi')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    language === 'vi'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md shadow-green-200'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted border border-muted/60'
                  }`}
                >
                  <span className="text-lg">🇻🇳</span>
                  Tiếng Việt
                </button>
                <button
                  onClick={() => setLanguage('en')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    language === 'en'
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-200'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted border border-muted/60'
                  }`}
                >
                  <span className="text-lg">🇬🇧</span>
                  English
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Notifications Section */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-0 shadow-lg overflow-hidden bg-white/80 backdrop-blur-md rounded-2xl">
          <CardContent className="p-0">
            <div className="px-5 py-4 flex items-center gap-3 border-b border-muted/40">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                <Bell className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground/90">{t.settings_notifications}</p>
                <p className="text-xs text-muted-foreground">{t.settings_notifications_desc}</p>
              </div>
            </div>
            <div className="divide-y divide-muted/40">
              {/* Push Notifications */}
              <div className="px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t.settings_push_notifications}</span>
                </div>
                <Switch checked={pushEnabled} onCheckedChange={setPushEnabled} />
              </div>
              {/* Email Notifications */}
              <div className="px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t.settings_email_notifications}</span>
                </div>
                <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
              </div>
              {/* Order Updates */}
              <div className="px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t.settings_order_updates}</span>
                </div>
                <Switch checked={orderUpdates} onCheckedChange={setOrderUpdates} />
              </div>
              {/* Promotions */}
              <div className="px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Gift className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t.settings_promotions}</span>
                </div>
                <Switch checked={promotions} onCheckedChange={setPromotions} />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Legal & Terms Section */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card className="border-0 shadow-lg overflow-hidden bg-white/80 backdrop-blur-md rounded-2xl">
          <CardContent className="p-0">
            <div className="px-5 py-4 flex items-center gap-3 border-b border-muted/40">
              <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground/90">{t.settings_legal}</p>
                <p className="text-xs text-muted-foreground">{t.settings_legal_desc}</p>
              </div>
            </div>
            <div className="divide-y divide-muted/40">
              {/* Terms of Service */}
              <button
                onClick={() => setShowTerms(true)}
                className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t.terms_of_service}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
              {/* Privacy Policy */}
              <button
                onClick={() => setShowTerms(true)}
                className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t.privacy_policy}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* About Section */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-0 shadow-lg overflow-hidden bg-white/80 backdrop-blur-md rounded-2xl">
          <CardContent className="p-0">
            <div className="px-5 py-4 flex items-center gap-3 border-b border-muted/40">
              <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
                <Info className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground/90">{t.settings_about}</p>
              </div>
            </div>
            <div className="divide-y divide-muted/40">
              <div className="px-5 py-3.5 flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">{t.settings_version}</span>
                <Badge variant="secondary" className="bg-muted text-muted-foreground font-mono text-xs">v1.0.0</Badge>
              </div>
              <div className="px-5 py-3.5 flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">{t.settings_contact}</span>
                <span className="text-sm text-green-600 font-medium">{t.settings_contact_email}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Terms Modal */}
      <TermsModal open={showTerms} onClose={() => setShowTerms(false)} />
    </div>
  )
}
