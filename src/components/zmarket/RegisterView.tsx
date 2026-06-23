'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Eye, EyeOff, Loader2, ArrowLeft, Info, Sparkles, CheckCircle2, Truck, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import TermsModal from './TermsModal'
import { translations } from '@/lib/translations'

const benefits = [
  { icon: '🛒', title: 'Mua sắm dễ dàng', desc: 'Hàng ngàn sản phẩm tươi ngon từ chợ truyền thống', color: 'from-green-400 to-emerald-500' },
  { icon: '🚀', title: 'Giao hàng nhanh chóng', desc: 'Nhận hàng chỉ trong 15 phút', color: 'from-sky-400 to-cyan-500' },
  { icon: '💳', title: 'Thanh toán linh hoạt', desc: 'COD, chuyển khoản, ví điện tử', color: 'from-amber-400 to-orange-500' },
]

export default function RegisterView() {
  const { setView, register, isLoading, language } = useAppStore()
  const t = translations[language]
  
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [termsModalOpen, setTermsModalOpen] = useState(false)

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google'
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast.error(language === 'vi' ? 'Mật khẩu không khớp' : 'Passwords do not match')
      return
    }
    if (!termsAccepted) {
      toast.error(language === 'vi' ? 'Bạn phải đồng ý với Điều khoản dịch vụ' : 'You must agree to the Terms of Service')
      return
    }
    try {
      await register(name, email, password, phone || undefined, address || undefined)
      toast.success(language === 'vi' ? 'Đăng ký thành công!' : 'Registration successful!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (language === 'vi' ? 'Đăng ký thất bại' : 'Registration failed'))
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left Panel - Hero with decorative pattern */}
        <div className="lg:w-1/2 bg-gradient-to-br from-green-600 via-green-700 to-emerald-800 text-white p-8 sm:p-12 flex flex-col justify-center relative overflow-hidden">
          {/* Decorative dot pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }} />
          {/* Decorative blurred circles */}
          <div className="absolute top-12 right-12 w-36 h-36 rounded-full bg-green-400/10 blur-2xl" />
          <div className="absolute bottom-20 left-8 w-28 h-28 rounded-full bg-emerald-300/10 blur-xl" />
          <motion.div
            className="absolute top-1/3 right-1/3 w-20 h-20 rounded-full bg-yellow-400/10 blur-xl"
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
              className="space-y-5"
            >
              {benefits.map((b, i) => (
                <motion.div
                  key={b.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                  className="flex items-start gap-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/20 to-white/10 flex items-center justify-center shrink-0 text-lg shadow-sm">
                    {b.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{b.title}</p>
                    <p className="text-sm text-green-200">{b.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Right Panel - Register Form */}
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
                <CardTitle className="text-2xl font-bold">{language === 'vi' ? 'Đăng ký' : 'Register'}</CardTitle>
                <CardDescription>{language === 'vi' ? 'Tạo tài khoản để bắt đầu mua sắm' : 'Create an account to start shopping'}</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">{language === 'vi' ? 'Họ và tên' : 'Full Name'}</Label>
                    <Input
                      id="name"
                      placeholder={language === 'vi' ? 'Nguyễn Văn A' : 'John Doe'}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="transition-all focus:ring-2 focus:ring-green-200"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">{language === 'vi' ? 'Email / Số điện thoại' : 'Email / Phone Number'}</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="example@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="transition-all focus:ring-2 focus:ring-green-200"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">{language === 'vi' ? 'Mật khẩu' : 'Password'}</Label>
                    <div className="relative">
                      <Input
                        id="reg-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder={language === 'vi' ? 'Ít nhất 6 ký tự' : 'At least 6 characters'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pr-10 transition-all focus:ring-2 focus:ring-green-200"
                        required
                        minLength={6}
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
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">{language === 'vi' ? 'Nhập lại mật khẩu' : 'Confirm Password'}</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder={language === 'vi' ? 'Nhập lại mật khẩu' : 'Confirm Password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="transition-all focus:ring-2 focus:ring-green-200"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="phone">{language === 'vi' ? 'Số điện thoại' : 'Phone Number'}</Label>
                      <Input
                        id="phone"
                        placeholder="0901234567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="transition-all focus:ring-2 focus:ring-green-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">{language === 'vi' ? 'Địa chỉ' : 'Address'}</Label>
                      <Input
                        id="address"
                        placeholder={language === 'vi' ? 'Quận 1, TP.HCM' : 'District 1, HCMC'}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="transition-all focus:ring-2 focus:ring-green-200"
                      />
                    </div>
                  </div>

                  {/* Terms acceptance checkbox */}
                  <div className="flex items-start gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-1 accent-green-600 rounded"
                    />
                    <label htmlFor="terms" className="text-xs text-muted-foreground leading-normal cursor-pointer select-none">
                      {language === 'vi' ? (
                        <>
                          Tôi đồng ý với{' '}
                          <button
                            type="button"
                            onClick={() => setTermsModalOpen(true)}
                            className="text-green-600 hover:underline font-semibold"
                          >
                            Điều khoản dịch vụ
                          </button>{' '}
                          của Z-Market
                        </>
                      ) : (
                        <>
                          I agree to the{' '}
                          <button
                            type="button"
                            onClick={() => setTermsModalOpen(true)}
                            className="text-green-600 hover:underline font-semibold"
                          >
                            Terms of Service
                          </button>{' '}
                          of Z-Market
                        </>
                      )}
                    </label>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold h-11 shadow-md hover:shadow-lg transition-all"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {language === 'vi' ? 'Đang đăng ký...' : 'Registering...'}
                      </>
                    ) : (
                      language === 'vi' ? 'Đăng ký' : 'Register'
                    )}
                  </Button>
                </form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-3 text-muted-foreground font-medium">{language === 'vi' ? 'Hoặc' : 'Or'}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button variant="outline" className="w-full h-11 font-medium" type="button" onClick={handleGoogleLogin}>
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    {language === 'vi' ? 'Đăng ký bằng Google' : 'Sign up with Google'}
                  </Button>
                </div>
                <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-2">
                  <Info className="h-3 w-3" />
                  {language === 'vi' ? 'Yêu cầu cấu hình Google Client ID' : 'Google Client ID configuration required'}
                </p>

                <p className="text-center text-sm text-muted-foreground mt-6">
                  {language === 'vi' ? 'Đã có tài khoản?' : 'Already have an account?'}{' '}
                  <button
                    onClick={() => setView('login')}
                    className="text-green-600 hover:text-green-700 hover:underline font-semibold transition-colors"
                  >
                    {language === 'vi' ? 'Đăng nhập' : 'Log in'}
                  </button>
                </p>

                <button
                  onClick={() => setView('landing')}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mt-4 mx-auto transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {language === 'vi' ? 'Quay lại trang chủ' : 'Back to home page'}
                </button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      <TermsModal open={termsModalOpen} onClose={() => setTermsModalOpen(false)} />

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-400 mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-4 text-center text-sm">
          © Z-Market — {language === 'vi' ? 'Chợ Số Việt Nam' : 'Vietnamese Market'}
        </div>
      </footer>
    </div>
  )
}
