import { create } from 'zustand'
import { csrfFetch } from '@/lib/csrf-fetch'

export interface User {
  id: string
  email: string
  name: string
  phone?: string | null
  avatar?: string | null
  role: string
  address?: string | null
  isActive: boolean
  createdAt: string
}

export interface CartItem {
  id: string
  quantity: number
  userId: string
  productId: string
  variantId?: string | null
  createdAt: string
  product: {
    id: string
    name: string
    price: number
    originalPrice?: number | null
    image?: string | null
    unit: string
    inStock: boolean
    shop: { id: string; name: string }
    category: { id: string; name: string }
  }
}

interface AppState {
  user: User | null
  currentView: string
  currentTab: string
  cart: CartItem[]
  cartTotal: number
  isLoading: boolean
  chatTargetUserId: string | null
  language: 'vi' | 'en'
  // methods
  setUser: (user: User | null) => void
  setView: (view: string) => void
  setTab: (tab: string) => void
  setChatTargetUserId: (id: string | null) => void
  setLanguage: (lang: 'vi' | 'en') => void
  setLoading: (loading: boolean) => void
  fetchCart: () => Promise<void>
  addToCart: (productId: string, quantity?: number, variantId?: string | null) => Promise<void>
  updateCartItem: (id: string, quantity: number) => Promise<void>
  removeCartItem: (id: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string, phone?: string, address?: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  currentView: 'landing',
  currentTab: '',
  chatTargetUserId: null,
  language: 'vi',
  cart: [],
  cartTotal: 0,
  isLoading: false,

  setUser: (user) => set({ user }),
  setChatTargetUserId: (chatTargetUserId) => set({ chatTargetUserId }),
  setLanguage: (language) => set({ language }),

  setView: (view) => {
    set({ currentView: view, currentTab: '' })
    if (typeof window !== 'undefined') {
      if (view === 'buyer-dashboard') {
        const buyerPaths = ['/san-pham', '/gio-hang', '/don-hang']
        if (buyerPaths.includes(window.location.pathname)) {
          return
        }
      }
      const urlMap: Record<string, string> = {
        landing: '/',
        login: '/dang-nhap',
        register: '/dang-ky',
        'buyer-dashboard': '/san-pham',
        'seller-dashboard': '/seller',
        'shipper-dashboard': '/shipper',
        'admin-dashboard': '/admin',
      }
      const newPath = urlMap[view]
      if (newPath && window.location.pathname !== newPath) {
        window.location.href = newPath
      }
    }
  },

  setTab: (tab) => {
    set({ currentTab: tab })
    if (typeof window !== 'undefined') {
      const { currentView } = get()
      if (currentView === 'buyer-dashboard') {
        const tabMap: Record<string, string> = {
          cart: '/gio-hang',
          orders: '/don-hang',
          products: '/san-pham',
        }
        const newPath = tabMap[tab]
        if (newPath && window.location.pathname !== newPath) {
          window.location.href = newPath
        }
      }
    }
  },

  setLoading: (isLoading) => set({ isLoading }),

  fetchCart: async () => {
    try {
      const res = await fetch('/api/cart')
      if (res.ok) {
        const data = await res.json()
        set({ cart: data.cartItems || [], cartTotal: data.total || 0 })
      }
    } catch {
      // ignore
    }
  },

  addToCart: async (productId, quantity = 1, variantId = null) => {
    try {
      const res = await csrfFetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity, variantId }),
      })
      if (res.ok) {
        await get().fetchCart()
      } else {
        const data = await res.json()
        throw new Error(data.error || 'Không thể thêm vào giỏ hàng')
      }
    } catch (error) {
      throw error
    }
  },

  updateCartItem: async (id, quantity) => {
    try {
      const res = await csrfFetch(`/api/cart/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      })
      if (res.ok) {
        await get().fetchCart()
      }
    } catch {
      // ignore
    }
  },

  removeCartItem: async (id) => {
    try {
      const res = await csrfFetch(`/api/cart/${id}`, { method: 'DELETE' })
      if (res.ok) {
        await get().fetchCart()
      }
    } catch {
      // ignore
    }
  },

  login: async (email, password) => {
    set({ isLoading: true })
    try {
      const res = await csrfFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Đăng nhập thất bại')
      }
      const user = data.user as User
      set({ user, isLoading: false })

      // Route to correct dashboard using setView to sync browser URL
      const viewMap: Record<string, string> = {
        BUYER: 'buyer-dashboard',
        SELLER: 'seller-dashboard',
        SHIPPER: 'shipper-dashboard',
        ADMIN: 'admin-dashboard',
      }
      get().setView(viewMap[user.role] || 'buyer-dashboard')

      // Fetch cart for buyer
      if (user.role === 'BUYER') {
        get().fetchCart()
      }
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  register: async (name, email, password, phone, address) => {
    set({ isLoading: true })
    try {
      const res = await csrfFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone, address }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Đăng ký thất bại')
      }
      const user = data.user as User
      set({ user, isLoading: false })
      get().setView('buyer-dashboard')
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  logout: async () => {
    try {
      await csrfFetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore
    }
    set({ user: null, cart: [], cartTotal: 0 })
    get().setView('landing')
  },

  checkAuth: async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        if (data.user) {
          const user = data.user as User
          set({ user })
          const viewMap: Record<string, string> = {
            BUYER: 'buyer-dashboard',
            SELLER: 'seller-dashboard',
            SHIPPER: 'shipper-dashboard',
            ADMIN: 'admin-dashboard',
          }
          const targetView = viewMap[user.role] || 'buyer-dashboard'
          if (get().currentView !== targetView) {
            get().setView(targetView)
            if (user.role === 'BUYER') {
              get().fetchCart()
            }
          } else {
            if (user.role === 'BUYER') {
              get().fetchCart()
            }
          }
        }
      }
    } catch {
      // ignore
    }
  },
}))
