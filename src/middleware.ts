import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me')

// Map route prefix -> role được phép
const ROLE_ROUTES: { prefix: string; roles: string[]; loginRedirect?: string }[] = [
  { prefix: '/seller',     roles: ['SELLER'],         loginRedirect: '/dang-nhap' },
  { prefix: '/shipper',    roles: ['SHIPPER'],        loginRedirect: '/dang-nhap' },
  { prefix: '/admin',      roles: ['ADMIN'],          loginRedirect: '/dang-nhap' },
  { prefix: '/gio-hang',   roles: ['BUYER','SELLER'], loginRedirect: '/dang-nhap' },
  { prefix: '/thanh-toan', roles: ['BUYER','SELLER'], loginRedirect: '/dang-nhap' },
  { prefix: '/don-hang',   roles: ['BUYER','SELLER'], loginRedirect: '/dang-nhap' },
]

// Route công khai (kh cần đăng nhập)
const PUBLIC_ROUTES = ['/', '/dang-nhap', '/dang-ky', '/san-pham', '/sap-hang', '/chat']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Cho phép public routes + API + static
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.match(/\.(svg|png|jpg|ico|css|js|woff2)$/)
  ) {
    return NextResponse.next()
  }

  // 2. Đọc token từ cookie
  const token = request.cookies.get('token')?.value
  let role: string | null = null
  if (token) {
    try {
      const { payload } = await jwtVerify(token, SECRET)
      role = payload.role as string
    } catch {
      role = null
    }
  }

  // 3. Kiểm tra route cần role
  for (const route of ROLE_ROUTES) {
    if (pathname.startsWith(route.prefix)) {
      if (!token || !role) {
        const url = request.nextUrl.clone()
        url.pathname = route.loginRedirect || '/dang-nhap'
        url.searchParams.set('redirect', pathname)
        return NextResponse.redirect(url)
      }
      if (!route.roles.includes(role)) {
        // Redirect về trang chủ role của họ
        const home = role === 'SELLER' ? '/seller' : role === 'SHIPPER' ? '/shipper' : role === 'ADMIN' ? '/admin' : '/'
        const url = request.nextUrl.clone()
        url.pathname = home
        return NextResponse.redirect(url)
      }
    }
  }

  // 4. Nếu đã đăng nhập mà vào /dang-nhap → redirect về home
  if (token && role && (pathname === '/dang-nhap' || pathname === '/dang-ky')) {
    const home = role === 'SELLER' ? '/seller' : role === 'SHIPPER' ? '/shipper' : role === 'ADMIN' ? '/admin' : '/'
    const url = request.nextUrl.clone()
    url.pathname = home
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
