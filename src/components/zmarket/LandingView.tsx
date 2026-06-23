'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ShoppingBag, Store, Bike, ArrowRight, Star, Clock, Package, Truck, CalendarCheck, Quote, Heart, ShieldCheck, Zap } from 'lucide-react'
import TermsModal from './TermsModal'
import { translations } from '@/lib/translations'

import { CountUp } from '@/components/CountUp'

// Animated counter component
function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
        }
      },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref}>
      {visible ? <CountUp end={target} suffix={suffix} /> : <span>0{suffix}</span>}
    </div>
  )
}

// Fade-in on scroll component with framer-motion
function FadeInSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay)
        }
      },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [delay])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Floating emoji component with gentle animation
function FloatingEmoji({ emoji, className, duration = 6, delay = 0 }: { emoji: string; className: string; duration?: number; delay?: number }) {
  return (
    <motion.div
      className={`absolute pointer-events-none select-none ${className}`}
      animate={{
        y: [0, -15, 0],
        rotate: [0, 5, -5, 0],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'easeInOut',
        delay,
      }}
    >
      {emoji}
    </motion.div>
  )
}

const testimonials = [
  {
    name: 'Chị Mai Linh',
    role: 'Người mua',
    avatar: '👩',
    text: 'Z-Market giúp tôi mua rau củ tươi ngon mà không cần đi chợ sớm. Giao hàng nhanh, giá cả hợp lý!',
    rating: 5,
  },
  {
    name: 'Anh Đức Thắng',
    role: 'Tiểu thương',
    avatar: '👨‍🍳',
    text: 'Từ khi lên Z-Market, sạp hàng của tôi tiếp cận được nhiều khách hàng hơn. Quản lý đơn hàng rất dễ dàng!',
    rating: 5,
  },
  {
    name: 'Chị Hương Giang',
    role: 'Người mua',
    avatar: '👩‍💼',
    text: 'Thích nhất là tính năng theo dõi đơn hàng. Biết chính xác khi nào hàng đến, rất tiện lợi cho người bận rộn.',
    rating: 4,
  },
]

const howItWorks = [
  {
    step: '1',
    emoji: '🛒',
    title: 'Chọn sản phẩm',
    desc: 'Duyệt hàng ngàn sản phẩm tươi ngon từ các sạp hàng truyền thống',
  },
  {
    step: '2',
    emoji: '📱',
    title: 'Đặt hàng',
    desc: 'Thêm vào giỏ hàng, chọn địa chỉ và thanh toán chỉ với vài thao tác',
  },
  {
    step: '3',
    emoji: '🚚',
    title: 'Giao hàng nhanh',
    desc: 'Nhận hàng tận nơi chỉ trong 15 phút, theo dõi đơn hàng thời gian thực',
  },
]

const partners = [
  { emoji: '🏪', name: 'Chợ Bến Thành' },
  { emoji: '🛒', name: 'Siêu thị Co.op' },
  { emoji: '🚚', name: 'Giao Hàng Nhanh' },
  { emoji: '💳', name: 'VNPay' },
  { emoji: '🏪', name: 'Chợ Tân Định' },
  { emoji: '🛒', name: 'WinMart' },
]

export default function LandingView() {
  const { setView, language, setLanguage } = useAppStore()
  const [termsOpen, setTermsOpen] = useState(false)
  const t = translations[language]

  return (
    <div className="min-h-screen flex flex-col">
      {/* Floating Header */}
      <header className="absolute top-0 left-0 right-0 z-50 py-4 bg-transparent">
        <div className="max-w-6xl mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black tracking-wider text-white">Z-MARKET</span>
          </div>
          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md rounded-full p-1 border border-white/20">
              <button
                onClick={() => setLanguage('vi')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  language === 'vi' ? 'bg-white text-green-800 shadow-sm' : 'text-white hover:text-green-200'
                }`}
              >
                VI
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  language === 'en' ? 'bg-white text-green-800 shadow-sm' : 'text-white hover:text-green-200'
                }`}
              >
                EN
              </button>
            </div>
            
            <Button
              variant="ghost"
              className="text-white hover:bg-white/10 text-sm font-semibold"
              onClick={() => setView('login')}
            >
              {language === 'vi' ? 'Đăng nhập' : 'Log in'}
            </Button>
            <Button
              className="bg-white text-green-700 hover:bg-green-50 text-sm font-bold shadow-md"
              onClick={() => setView('register')}
            >
              {language === 'vi' ? 'Đăng ký' : 'Register'}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section with Background Image */}
      <section className="relative text-white overflow-hidden min-h-[650px] flex items-center pt-16">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://sfile.chatglm.cn/images-ppt/3af2830a2b53.jpg')`,
          }}
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-950/95 via-green-900/90 to-emerald-900/85" />

        {/* Animated decorative blurred circles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-12 left-[10%] w-28 h-28 rounded-full bg-green-400/10 blur-2xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute top-24 right-[15%] w-40 h-40 rounded-full bg-yellow-400/10 blur-3xl"
            animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          />
          <motion.div
            className="absolute bottom-16 left-[30%] w-32 h-32 rounded-full bg-emerald-300/10 blur-2xl"
            animate={{ scale: [1, 1.15, 1], opacity: [0.25, 0.5, 0.25] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          />
          <motion.div
            className="absolute bottom-28 right-[25%] w-20 h-20 rounded-full bg-white/10 blur-xl"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          />
        </div>

        {/* Floating emoji decorations */}
        <FloatingEmoji emoji="🥬" className="top-16 right-[20%] text-4xl opacity-20" duration={5} delay={0} />
        <FloatingEmoji emoji="🍎" className="bottom-24 left-[8%] text-3xl opacity-20" duration={6} delay={1} />
        <FloatingEmoji emoji="🐟" className="top-[45%] right-[6%] text-3xl opacity-20" duration={5.5} delay={0.5} />
        <FloatingEmoji emoji="🥕" className="top-[30%] left-[5%] text-2xl opacity-15" duration={7} delay={2} />
        <FloatingEmoji emoji="🍊" className="bottom-[35%] right-[35%] text-2xl opacity-15" duration={6.5} delay={1.5} />
        <FloatingEmoji emoji="🫑" className="top-[15%] left-[40%] text-2xl opacity-10" duration={8} delay={3} />

        <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-28 text-center w-full">
          {/* Status badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8 inline-flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-5 py-2.5 text-sm border border-white/20 shadow-lg"
          >
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-sm shadow-green-400/50" />
            {t.landing_subtitle}
          </motion.div>

          {/* Animated gradient hero title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight mb-6 drop-shadow-2xl"
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-300 via-emerald-200 to-yellow-200 animate-gradient bg-[length:200%_200%]"
              style={{
                animation: 'gradientShift 4s ease infinite',
              }}
            >
              {t.landing_title}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg sm:text-xl text-green-100/90 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            {t.landing_desc}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button
              size="lg"
              className="bg-white text-green-700 hover:bg-green-50 font-semibold text-base px-8 h-13 shadow-xl hover:shadow-2xl transition-all hover:scale-105 group"
              onClick={() => setView('login')}
            >
              {language === 'vi' ? 'Đăng nhập ngay' : 'Log in now'}
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10 font-semibold text-base px-8 h-13 backdrop-blur-md hover:scale-105 transition-all"
              onClick={() => setView('register')}
            >
              {language === 'vi' ? 'Tạo tài khoản' : 'Create account'}
            </Button>
          </motion.div>
        </div>

        {/* Bottom wave decoration */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 80L48 72C96 64 192 48 288 40C384 32 480 32 576 37.3C672 42.7 768 53.3 864 56C960 58.7 1056 53.3 1152 45.3C1248 37.3 1344 26.7 1392 21.3L1440 16V80H0Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* Role Cards */}
      <section className="max-w-6xl mx-auto px-4 py-12 sm:py-20 -mt-2">
        <FadeInSection>
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">{language === 'vi' ? 'Chọn vai trò của bạn' : 'Select your role'}</h2>
          <p className="text-muted-foreground text-center mb-10">{language === 'vi' ? 'Z-Market dành cho mọi người' : 'Z-Market is for everyone'}</p>
        </FadeInSection>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { icon: ShoppingBag, emoji: '🛍️', title: t.role_buyer, desc: language === 'vi' ? 'Khám phá hàng ngàn sản phẩm tươi ngon, đặt hàng dễ dàng, giao hàng nhanh chóng' : 'Explore thousands of fresh products, order easily, fast delivery', gradient: 'from-green-50 to-emerald-50', border: 'border-green-200/60', iconBg: 'bg-gradient-to-br from-green-400 to-emerald-500', iconColor: 'text-white', hoverShadow: 'hover:shadow-green-200/50' },
            { icon: Store, emoji: '🏪', title: t.role_seller, desc: language === 'vi' ? 'Đưa sạp hàng lên mạng, tiếp cận hàng nghìn khách hàng, quản lý đơn hàng dễ dàng' : 'Bring your stall online, reach thousands of customers, manage orders easily', gradient: 'from-amber-50 to-orange-50', border: 'border-amber-200/60', iconBg: 'bg-gradient-to-br from-amber-400 to-orange-500', iconColor: 'text-white', hoverShadow: 'hover:shadow-amber-200/50' },
            { icon: Bike, emoji: '🏍️', title: t.role_shipper, desc: language === 'vi' ? 'Nhận đơn giao hàng linh hoạt, thu nhập hấp dẫn, theo dõi đơn hàng tiện lợi' : 'Take flexible delivery jobs, attractive income, track orders easily', gradient: 'from-sky-50 to-cyan-50', border: 'border-sky-200/60', iconBg: 'bg-gradient-to-br from-sky-400 to-cyan-500', iconColor: 'text-white', hoverShadow: 'hover:shadow-sky-200/50' },
          ].map((role, i) => (
            <FadeInSection key={role.emoji} delay={i * 150}>
              <Card
                className={`group cursor-pointer bg-gradient-to-br ${role.gradient} ${role.border} backdrop-blur-sm hover:shadow-xl ${role.hoverShadow} transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] border`}
                onClick={() => setView('login')}
              >
                <CardContent className="p-8 text-center">
                  <div className={`w-18 h-18 rounded-2xl ${role.iconBg} flex items-center justify-center mx-auto mb-5 shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300`}>
                    <role.icon className={`h-9 w-9 ${role.iconColor}`} />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{role.emoji} {role.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{role.desc}</p>
                </CardContent>
              </Card>
            </FadeInSection>
          ))}
        </div>
      </section>

      {/* Stats Bar with Animated Counters */}
      <section className="relative overflow-hidden">
        {/* Gradient background with pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-700 via-emerald-700 to-green-800" />
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }} />
        <div className="relative max-w-6xl mx-auto px-4 py-14">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
            <FadeInSection>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
                <div className="text-3xl sm:text-4xl font-black text-white">
                  <AnimatedCounter target={200} suffix="+" />
                </div>
                <div className="text-sm text-green-200 mt-2 font-medium">Sạp hàng</div>
              </div>
            </FadeInSection>
            <FadeInSection delay={150}>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
                <div className="text-3xl sm:text-4xl font-black text-white">
                  <AnimatedCounter target={5000} suffix="+" />
                </div>
                <div className="text-sm text-green-200 mt-2 font-medium">Sản phẩm</div>
              </div>
            </FadeInSection>
            <FadeInSection delay={300}>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
                <div className="text-3xl sm:text-4xl font-black text-white flex items-center justify-center gap-2">
                  <Clock className="h-7 w-7" />
                  <AnimatedCounter target={15} suffix="ph" />
                </div>
                <div className="text-sm text-green-200 mt-2 font-medium">Giao hàng</div>
              </div>
            </FadeInSection>
            <FadeInSection delay={450}>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
                <div className="text-3xl sm:text-4xl font-black text-white flex items-center justify-center gap-1">
                  4.9
                  <Star className="h-7 w-7 fill-yellow-400 text-yellow-400" />
                </div>
                <div className="text-sm text-green-200 mt-2 font-medium">Đánh giá</div>
              </div>
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-6xl mx-auto px-4 py-12 sm:py-20">
        <FadeInSection>
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">Cách thức hoạt động</h2>
          <p className="text-muted-foreground text-center mb-14">Mua sắm chỉ với 3 bước đơn giản</p>
        </FadeInSection>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 relative">
          {/* Connecting line (desktop only) */}
          <div className="hidden sm:block absolute top-[60px] left-[20%] right-[20%] h-[2px]">
            <div className="relative w-full h-full">
              <div className="absolute inset-0 bg-gradient-to-r from-green-300 via-emerald-400 to-green-300" />
              {/* Arrow at end of first segment */}
              <div className="absolute top-1/2 left-[50%] -translate-y-1/2 -translate-x-1/2">
                <ArrowRight className="h-5 w-5 text-emerald-500" />
              </div>
              {/* Arrow at end of second segment */}
              <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2">
                <ArrowRight className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
          </div>

          {howItWorks.map((step, i) => (
            <FadeInSection key={step.step} delay={i * 200}>
              <div className="text-center relative">
                <motion.div
                  className="relative z-10"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center mx-auto mb-5 text-4xl border-4 border-white shadow-lg ring-2 ring-green-200">
                    {step.emoji}
                  </div>
                  <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-bold mb-3 shadow-md">
                    {step.step}
                  </div>
                  <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">{step.desc}</p>
                </motion.div>
              </div>
            </FadeInSection>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-gradient-to-b from-muted/30 to-transparent">
        <div className="max-w-6xl mx-auto px-4 py-12 sm:py-20">
          <FadeInSection>
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">{language === 'vi' ? 'Tính năng nổi bật' : 'Key Features'}</h2>
          </FadeInSection>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Package, title: language === 'vi' ? 'Xem sản phẩm & sạp hàng' : 'Browse Stalls & Products', desc: language === 'vi' ? 'Duyệt hàng ngàn sản phẩm từ các sạp hàng truyền thống' : 'Browse thousands of fresh items directly from local stalls', gradient: 'from-green-500 to-emerald-500' },
              { icon: ShoppingBag, title: language === 'vi' ? 'Giỏ hàng & thanh toán' : 'Cart & Checkout', desc: language === 'vi' ? 'Thêm vào giỏ hàng và thanh toán dễ dàng, đa dạng phương thức' : 'Easy cart management and multiple secure checkout methods', gradient: 'from-teal-500 to-cyan-500' },
              { icon: Truck, title: language === 'vi' ? 'Theo dõi đơn hàng' : 'Order Tracking', desc: language === 'vi' ? 'Cập nhật trạng thái đơn hàng theo thời gian thực' : 'Real-time updates on your order and shipment delivery status', gradient: 'from-purple-500 to-violet-500' },
              { icon: CalendarCheck, title: language === 'vi' ? 'Đặt lịch giao hàng' : 'Scheduled Delivery', desc: language === 'vi' ? 'Chọn thời gian giao hàng phù hợp với bạn' : 'Flexible scheduler to choose your preferred delivery time', gradient: 'from-amber-500 to-orange-500' },
            ].map((feature, i) => (
              <FadeInSection key={i} delay={i * 100}>
                <div className="flex gap-4 p-5 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/80 hover:bg-white hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 transition-transform`}>
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-6xl mx-auto px-4 py-12 sm:py-20">
        <FadeInSection>
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">{language === 'vi' ? 'Khách hàng nói gì' : 'What Our Customers Say'}</h2>
          <p className="text-muted-foreground text-center mb-12">{language === 'vi' ? 'Hàng ngàn người tin dùng Z-Market' : 'Thousands of active users trust Z-Market'}</p>
        </FadeInSection>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <FadeInSection key={t.name} delay={i * 150}>
              <Card className="h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <Quote className="h-10 w-10 text-green-200 mb-3" />
                  <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{t.text}</p>
                  <div className="flex items-center gap-3 pt-4 border-t border-green-100">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center text-lg shadow-sm">
                      {t.avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                    <div className="ml-auto flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, si) => (
                        <Star
                          key={si}
                          className={`h-3.5 w-3.5 ${si < t.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}
                        />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </FadeInSection>
          ))}
        </div>
      </section>

      {/* Partner Logos */}
      <section className="bg-muted/30 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <FadeInSection>
            <p className="text-center text-sm text-muted-foreground mb-8 font-medium uppercase tracking-wider">{language === 'vi' ? 'Đối tác tin cậy' : 'Trusted Partners'}</p>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
              {partners.map((p, i) => (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="flex items-center gap-2 px-5 py-3 bg-white rounded-xl shadow-sm border text-sm font-medium text-muted-foreground hover:shadow-md transition-shadow"
                >
                  <span className="text-xl">{p.emoji}</span>
                  <span>{p.name}</span>
                </motion.div>
              ))}
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-r from-green-600 via-emerald-600 to-green-700 text-white">
        {/* Decorative elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white/5 blur-2xl" />
          <div className="absolute -bottom-10 -right-10 w-48 h-48 rounded-full bg-white/5 blur-2xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-emerald-400/5 blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 py-14 sm:py-20 text-center">
          <FadeInSection>
            <h2 className="text-2xl sm:text-4xl font-black mb-5">{language === 'vi' ? 'Tham gia cùng 200+ sạp hàng' : 'Join 200+ Market Stalls'}</h2>
            <p className="text-green-100 mb-8 max-w-xl mx-auto text-lg leading-relaxed">
              {language === 'vi' ? 'Hàng ngàn sản phẩm tươi ngon đang chờ bạn. Đăng ký ngay để nhận ưu đãi đặc biệt!' : 'Thousands of fresh, high-quality products await. Register today for special deals!'}
            </p>
            <Button
              size="lg"
              className="bg-white text-green-700 hover:bg-green-50 font-bold px-10 h-13 shadow-xl hover:shadow-2xl hover:scale-105 transition-all group"
              onClick={() => setView('register')}
            >
              {language === 'vi' ? 'Đăng ký miễn phí' : 'Register for Free'}
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </FadeInSection>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="bg-gray-950 text-gray-400 mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-10 mb-10">
            {/* Brand */}
            <div className="sm:col-span-1">
              <h3 className="text-2xl font-black text-white mb-3 tracking-tight">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-400">Z-MARKET</span>
              </h3>
              <p className="text-sm leading-relaxed text-gray-400">{language === 'vi' ? 'Chợ truyền thống số hoá — Mua sắm thực phẩm tươi ngon, giao hàng tận nơi nhanh chóng.' : 'Digitized traditional market — Buy fresh foods, fast delivery to your door.'}</p>
              <div className="flex gap-3 mt-5">
                <div className="w-9 h-9 rounded-lg bg-gray-800/80 hover:bg-green-600 flex items-center justify-center transition-colors cursor-pointer text-sm border border-gray-700/50 hover:border-green-500">📘</div>
                <div className="w-9 h-9 rounded-lg bg-gray-800/80 hover:bg-green-600 flex items-center justify-center transition-colors cursor-pointer text-sm border border-gray-700/50 hover:border-green-500">📸</div>
                <div className="w-9 h-9 rounded-lg bg-gray-800/80 hover:bg-green-600 flex items-center justify-center transition-colors cursor-pointer text-sm border border-gray-700/50 hover:border-green-500">💬</div>
              </div>
            </div>
            {/* Links */}
            <div>
              <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">{language === 'vi' ? 'Sản phẩm' : 'Products'}</h4>
              <ul className="space-y-3 text-sm">
                <li><button className="hover:text-green-400 transition-colors" onClick={() => setView('login')}>{language === 'vi' ? '🥬 Rau củ quả' : '🥬 Vegetables & Fruits'}</button></li>
                <li><button className="hover:text-green-400 transition-colors" onClick={() => setView('login')}>{language === 'vi' ? '🥩 Thịt & cá' : '🥩 Meat & Fish'}</button></li>
                <li><button className="hover:text-green-400 transition-colors" onClick={() => setView('login')}>{language === 'vi' ? '🌶️ Gia vị' : '🌶️ Spices'}</button></li>
                <li><button className="hover:text-green-400 transition-colors" onClick={() => setView('login')}>{language === 'vi' ? '🥜 Thực phẩm khô' : '🥜 Dried Foods'}</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">{language === 'vi' ? 'Hỗ trợ' : 'Supports'}</h4>
              <ul className="space-y-3 text-sm">
                <li><span className="hover:text-green-400 transition-colors cursor-pointer">{language === 'vi' ? '❓ Trung tâm trợ giúp' : '❓ Help Center'}</span></li>
                <li><span className="hover:text-green-400 transition-colors cursor-pointer">{language === 'vi' ? '🔄 Chính sách đổi trả' : '🔄 Returns & Refund'}</span></li>
                <li><span className="hover:text-green-400 transition-colors cursor-pointer" onClick={() => setTermsOpen(true)}>{t.terms_of_service}</span></li>
                <li><span className="hover:text-green-400 transition-colors cursor-pointer">{language === 'vi' ? '📞 Liên hệ' : '📞 Contact Us'}</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">{language === 'vi' ? 'Kết nối' : 'Connect'}</h4>
              <div className="space-y-3 text-sm">
                <p className="flex items-center gap-2"><span>📞</span> Hotline: 1900-xxxx</p>
                <p className="flex items-center gap-2"><span>✉️</span> support@zmarket.vn</p>
                <p className="flex items-center gap-2"><span>📍</span> TP. Hồ Chí Minh</p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
            <p>{language === 'vi' ? '© Z-Market — Chợ Số Việt Nam. Tất cả quyền được bảo lưu.' : '© Z-Market — Vietnamese Market. All rights reserved.'}</p>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <ShieldCheck className="h-3.5 w-3.5" />
              {language === 'vi' ? 'Bảo mật & An toàn' : 'Safe & Secure'}
              <span className="mx-2">•</span>
              <Zap className="h-3.5 w-3.5" />
              {language === 'vi' ? 'Giao hàng nhanh' : 'Express Delivery'}
            </div>
          </div>
        </div>

        <TermsModal open={termsOpen} onClose={() => setTermsOpen(false)} />
      </footer>

      {/* Global animation keyframes */}
      <style jsx global>{`
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  )
}
