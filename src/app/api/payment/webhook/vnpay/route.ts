import { NextResponse } from 'next/server'
import { handleVnpayWebhook } from '@/modules/payment/service'

// VNPay IPN (Instant Payment Notification) — server-to-server
// KHÔNG cần auth, verify bằng chữ ký HMAC
export async function GET(request: Request) {
  const url = new URL(request.url)
  const params: Record<string, string> = {}
  url.searchParams.forEach((value, key) => { params[key] = value })

  const result = await handleVnpayWebhook(params)
  return NextResponse.json(result)
}

// VNPay cũng có thể gửi POST
export async function POST(request: Request) {
  const formData = await request.formData()
  const params: Record<string, string> = {}
  formData.forEach((value, key) => { params[key] = String(value) })

  const result = await handleVnpayWebhook(params)
  return NextResponse.json(result)
}
