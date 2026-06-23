'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ShoppingBag, Store, Bike, Shield, Eye, EyeOff, Loader2, Info, Sparkles, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

const roles = [
  { id: 'BUYER', label: 'Người mua', icon: ShoppingBag, emoji: '🛍️', color: 'from-green-400 to-emerald-500', bgColor: 'bg-green-500/20 border-green-400/30 hover:bg-green-500/30 hover:border-green-400/50' },
  { id: 'SELLER', label: 'Tiểu thương', icon: Store, emoji: '🏪', color: 'from-amber-400 to-orange-500', bgColor: 'bg-amber-500/20 border-amber-400/30 hover:bg-amber-500/30 hover:border-amber-400/50' },
  { id: 'SHIPPER', label: 'Shipper', icon: Bike, emoji: '🏍️', color: 'from-sky-400 to-cyan-500', bgColor: 'bg-sky-500/20 border-sky-400/30 hover:bg-sky-500/30 hover:border-sky-400/50' },
  { id: 'ADMIN', label: 'Quản trị viên', icon: Shield, emoji: '🛡️', color: 'from-rose-400 to-pink-500', bgColor: 'bg-rose-500/20 border-rose-400/30 hover:bg-rose-500/30 hover:border-rose-400/50' },
]

const testAccounts = [
  { role: 'BUYER', email: 'nguoimua@zmarket.vn', password: '123456' },
  { role: 'SELLER', email: 'tieuthuong@zmarket.vn', password: '123456' },
  { role: 'SHIPPER', email: 'shipper@zmarket.vn', password: '123456' },
  { role: 'ADMIN', email: 'admin@123', password: 'admin@123' },
]

export default function LoginView() {
  const { setView, login, isLoading } = useAppStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [selectedRole, setSelectedRole] = useState('BUYER')

  // Handle auth_error from OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const authError = params.get('auth_error')
    if (authError) {
      const errorMessages: Record<string, string> = {
        'access_denied': 'Bạn đã từ chối quyền truy cập',
        'oauth_failed': 'Xác thực Google thất bại',
        'account_disabled': 'Tài khoản đã bị khóa',
      }
      toast.error('Đăng nhập Google thất bại: ' + (errorMessages[authError] || authError))
      window.history.replaceState({}, '', '/')
    }
  }, [])

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google'
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login(email, password)
      toast.success('Đăng nhập thành công!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Đăng nhập thất bại')
    }
  }

  const fillTestAccount = (role: string) => {
    const account = testAccounts.find(a => a.role === role)
    if (account) {
      setEmail(account.email)
      setPassword(account.password)
      setSelectedRole(role)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left Panel - Hero with decorative pattern */}
        <div className="lg:w-1/2 bg-gradient-to-br from-green-600 via-green-700 to-emerald-800 text-white p-8 sm:p-12 flex flex-col justify-center relative overflow-hidden">
          {/* Decorative pattern overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }} />
          {/* Decorative blurred circles */}
          <div className="absolute top-8 right-8 w-32 h-32 rounded-full bg-green-400/10 blur-2xl" />
          <div className="absolute bottom-16 left-8 w-24 h-24 rounded-full bg-emerald-300/10 blur-xl" />
          <motion.div
            className="absolute top-1/4 right-1/4 w-16 h-16 rounded-full bg-yellow-400/10 blur-xl"
            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 4, repeat: Infinity }}
          />

          <div className="max-w-md mx-auto relative">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-4xl sm:text-5xl font-black">Z-MARKET</h1>
                <Sparkles className="h-6 w-6 text-yellow-300 animate-pulse" />
              </div>
              <p className="text-green-200 text-lg mb-10">Chợ truyền thống số hoá</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-4"
            >
              <p className="text-sm text-green-200 font-medium flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
                Chọn vai trò để đăng nhập nhanh:
              </p>
              <div className="grid grid-cols-2 gap-3">
                {roles.map((role, i) => (
                  <motion.button
                    key={role.id}
                    onClick={() => fillTestAccount(role.id)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 + i * 0.1 }}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-white ${role.bgColor} ${
                      selectedRole === role.id ? 'ring-2 ring-white/50' : ''
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${role.color} flex items-center justify-center shadow-md`}>
                      <role.icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-left">
                      <span className="text-sm font-semibold block">{role.label}</span>
                      <span className="text-[10px] text-white/60">{role.emoji}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3 bg-white/5 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10">
                <span className="text-sm">💡</span>
                <p className="text-xs text-green-200">
                  Nhấn vào vai trò để tự động điền tài khoản thử nghiệm
                </p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-gradient-to-br from-background to-muted/30 relative">
          {/* Subtle background decoration */}
          <div className="absolute top-8 right-8 w-40 h-40 rounded-full bg-green-100/30 blur-3xl" />
          <div className="absolute bottom-8 left-8 w-32 h-32 rounded-full bg-emerald-100/20 blur-2xl" />

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-md relative"
          >
            <Card className="border-0 shadow-xl sm:border sm:shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl font-bold">Đăng nhập</CardTitle>
                <CardDescription className="text-sm">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={selectedRole}
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      {roles.find(r => r.id === selectedRole)
                        ? `Đăng nhập với tư cách ${roles.find(r => r.id === selectedRole)?.label}`
                        : 'Đăng nhập vào tài khoản'}
                    </motion.span>
                  </AnimatePresence>
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="example@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="transition-all focus:ring-2 focus:ring-green-200"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Mật khẩu</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Nhập mật khẩu"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pr-10 transition-all focus:ring-2 focus:ring-green-200"
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold h-11 shadow-md hover:shadow-lg transition-all"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang đăng nhập...
                      </>
                    ) : (
                      'Đăng nhập'
                    )}
                  </Button>
                </form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-3 text-muted-foreground font-medium">Hoặc</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button variant="outline" className="w-full h-11 font-medium" type="button" onClick={handleGoogleLogin}>
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    Đăng nhập bằng Google
                  </Button>
                </div>
                <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-2">
                  <Info className="h-3 w-3" />
                  Yêu cầu cấu hình Google Client ID
                </p>

                <p className="text-center text-sm text-muted-foreground mt-6">
                  Chưa có tài khoản?{' '}
                  <button
                    onClick={() => setView('register')}
                    className="text-green-600 hover:text-green-700 hover:underline font-semibold transition-colors"
                  >
                    Đăng ký ngay
                  </button>
                </p>
              </CardContent>
            </Card>

            <button
              onClick={() => setView('landing')}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mt-6 mx-auto transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại trang chủ
            </button>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-400 mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-4 text-center text-sm">
          © Z-Market — Chợ Số Việt Nam
        </div>
      </footer>
    </div>
  )
}
