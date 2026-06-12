import { NextResponse } from 'next/server'
import { clearAuthCookie } from '@/lib/auth'

export async function POST() {
  const headers = clearAuthCookie()
  return NextResponse.json(
    { message: 'Đăng xuất thành công' },
    { headers }
  )
}
