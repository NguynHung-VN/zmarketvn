import crypto from 'crypto'

/**
 * VNPay Payment Gateway integration
 * Docs: https://sandbox.vnpayment.vn/apis/
 */

const VNP_TMN_CODE = process.env.VNP_TMN_CODE || ''
const VNP_HASH_SECRET = process.env.VNP_HASH_SECRET || ''
const VNP_URL = process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'
const VNP_RETURN_URL = process.env.VNP_RETURN_URL || ''
const VNP_IPN_URL = process.env.VNP_IPN_URL || ''

/** Tạo URL thanh toán VNPay */
export function createVnpayPaymentUrl(params: {
  txnRef: string         // mã đơn nội bộ
  amount: number          // VND (số nguyên)
  orderInfo: string
  locale?: string
}): string {
  const date = new Date()
  const createDate = formatDate(date)

  const vnpParams: Record<string, string> = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: VNP_TMN_CODE,
    vnp_Locale: params.locale || 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: params.txnRef,
    vnp_OrderInfo: params.orderInfo,
    vnp_OrderType: 'other',
    vnp_Amount: String(params.amount * 100),  // VNPay yêu cầu x100
    vnp_ReturnUrl: VNP_RETURN_URL,
    vnp_IpnUrl: VNP_IPN_URL,
    vnp_CreateDate: createDate,
    vnp_BankCode: '', // để trống cho user chọn
  }

  // Sắp xếp key theo alphabet
  const sorted = sortObject(vnpParams)
  const querystring = new URLSearchParams(sorted).toString()
  const secureHash = hmacSHA512(VNP_HASH_SECRET, querystring)

  return `${VNP_URL}?${querystring}&vnp_SecureHash=${secureHash}`
}

/** Verify chữ ký từ VNPay callback (IPN/Return) */
export function verifyVnpayCallback(queryParams: Record<string, string>): {
  isValid: boolean
  responseCode: string
  txnRef: string
  amount: number
} {
  const secureHash = queryParams['vnp_SecureHash']
  if (!secureHash) return { isValid: false, responseCode: '', txnRef: '', amount: 0 }

  // Gỡ secureHash ra, sort lại, tạo chuỗi để verify
  const { vnp_SecureHash, vnp_SecureHashType, ...rest } = queryParams
  const sorted = sortObject(rest)
  const querystring = new URLSearchParams(sorted).toString()
  const computedHash = hmacSHA512(VNP_HASH_SECRET, querystring)

  return {
    isValid: secureHash === computedHash,
    responseCode: queryParams['vnp_ResponseCode'] || '',
    txnRef: queryParams['vnp_TxnRef'] || '',
    amount: parseInt(queryParams['vnp_Amount'] || '0', 10) / 100,
  }
}

// ── Helpers ──
function hmacSHA512(key: string, data: string): string {
  return crypto.createHmac('sha512', key).update(data).digest('hex')
}

function sortObject(obj: Record<string, string>): Record<string, string> {
  return Object.keys(obj)
    .sort()
    .reduce((acc, key) => {
      if (obj[key] !== '' && obj[key] !== undefined) acc[key] = encodeURIComponent(obj[key]).replace(/%20/g, '+')
      return acc
    }, {} as Record<string, string>)
}

function formatDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}
