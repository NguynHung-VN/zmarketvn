# Z-MARKET — Hướng dẫn thi công chi tiết (Implementation Guide)

> **File companion của `ZMARKET_AUDIT_FIX_SPEC.md`.** File kia là bản đồ (cái gì hỏng, sửa thế nào). File này là bản thi công: code copy-paste, schema đầy đủ, cây file chính xác, lệnh migrate/seed, và prompt chi tiết cho từng task.
>
> **Cách dùng:** Dán §0 vào `AGENTS.md`. Giao từng Task (§15) cho Gemini theo thứ tự. Gemini đọc file này + file audit, dán code, chạy build, báo cáo theo Acceptance.

Ngày: 2026-06-21 · Stack: Next.js 15 App Router + Prisma + PostgreSQL + TypeScript

---

## §1 SCHEMA.Prisma — ĐẦY ĐỦ (thay thế toàn bộ file hiện tại)

> Lệnh: `npx prisma migrate dev --name zmarket_v2_full`
> Sau khi migrate: `npx prisma db seed` (xem §14)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── ENUMS ────────────────────────────────────────────────

enum Role {
  BUYER
  SELLER
  SHIPPER
  ADMIN
}

enum OrderStatus {
  PENDING        // chờ xác nhận
  PREPARING      // đang chuẩn bị
  READY          // sẵn sàng giao
  DELIVERING     // đang giao
  DELIVERED      // đã giao
  CANCELLED      // đã huỷ
  RETURNED       // hoàn hàng
}

enum PaymentMethod {
  COD
  VNPAY
  MOMO
  STRIPE
}

enum PaymentStatus {
  PENDING
  PAID
  FAILED
  REFUNDED
  EXPIRED
}

enum StockReason {
  IMPORT     // nhập kho
  SALE       // bán hàng (trừ kho)
  ADJUST     // điều chỉnh thủ công
  RETURN     // hoàn hàng (cộng lại)
  CANCEL     // huỷ đơn (cộng lại)
}

enum DeliveryStatus {
  ASSIGNED     // shipper đã nhận
  PICKED_UP    // đã lấy hàng
  IN_TRANSIT   // đang giao
  DELIVERED    // giao thành công
  FAILED       // giao thất bại
  RETURNED     // trả hàng
}

// ─── USER & AUTH ──────────────────────────────────────────

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String?                  // null nếu đăng nhập qua OAuth
  name          String
  phone         String?
  avatar        String?
  role          Role      @default(BUYER)
  address       String?
  isActive      Boolean   @default(true)
  googleId      String?   @unique
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  shop          Shop?
  cart          Cart?
  orders        Order[]
  reviews       Review[]
  wishlist      Wishlist[]
  conversations Conversation[]
  messages      Message[]
  deliveries    Delivery[]
  feedbacks     Feedback[]
  stockMovements StockMovement[]

  @@index([role])
  @@index([isActive])
}

// ─── SHOP (SẠP HÀNG) ──────────────────────────────────────

model Shop {
  id          String   @id @default(cuid())
  name        String
  description String?
  image       String?
  bannerImage String?
  address     String?
  phone       String?
  rating      Float    @default(0)
  reviewCount Int      @default(0)
  isActive    Boolean  @default(true)
  openHours   String?                  // "6:00 - 18:00"
  ownerId     String   @unique
  owner       User     @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  products    Product[]
  orders      Order[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([isActive])
}

// ─── CATEGORY ─────────────────────────────────────────────

model Category {
  id        String    @id @default(cuid())
  name      String
  icon      String?
  slug      String    @unique
  createdAt DateTime  @default(now())
  products  Product[]
}

// ─── PRODUCT ──────────────────────────────────────────────

model Product {
  id                String   @id @default(cuid())
  name              String
  description       String?
  longDescription   String?                  // mô tả dài (markdown/html)
  price             Int                       // giá bán (VND, số nguyên)
  originalPrice     Int?                      // giá gốc (nếu có KM)
  unit              String   @default("cái") // kg, bó, trái, hộp...
  stockQuantity     Int      @default(0)
  lowStockThreshold Int      @default(5)
  sku               String?  @unique
  images            String[]                  // nhiều ảnh, [0] = ảnh bìa
  weightGram        Int?                      // trọng lượng để tính phí ship
  origin            String?                   // xuất xứ
  storageInfo       String?                   // bảo quản / hạn sử dụng
  isActive          Boolean  @default(true)   // bật/tắt bán
  rating            Float    @default(0)
  reviewCount       Int      @default(0)
  soldCount         Int      @default(0)
  shopId            String
  categoryId        String
  shop              Shop     @relation(fields: [shopId], references: [id], onDelete: Cascade)
  category          Category @relation(fields: [categoryId], references: [id])
  variants          ProductVariant[]
  orderItems        OrderItem[]
  reviews           Review[]
  stockMovements    StockMovement[]
  wishlistItems     Wishlist[]
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([shopId])
  @@index([categoryId])
  @@index([isActive])
  @@index([stockQuantity])
}

// ─── PRODUCT VARIANT (phân loại: 0.5kg / 1kg / Loại 1...) ─

model ProductVariant {
  id            String  @id @default(cuid())
  productId     String
  name          String                  // "1kg", "Loại 1", "Hộp 500g"
  price         Int                      // giá theo biến thể (VND)
  stockQuantity Int     @default(0)
  sku           String?
  product       Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@index([productId])
}

// ─── STOCK MOVEMENT (nhật ký xuất/nhập kho) ───────────────

model StockMovement {
  id        String      @id @default(cuid())
  productId String
  variantId String?                      // null nếu là sản phẩm chính
  delta     Int                       // +nhập, -bán/-huỷ
  reason    StockReason
  note      String?                     // ghi chú
  orderId   String?
  userId    String?                     // ai thực hiện
  product   Product     @relation(fields: [productId], references: [id], onDelete: Cascade)
  user      User?       @relation(fields: [userId], references: [id])
  createdAt DateTime    @default(now())

  @@index([productId])
  @@index([reason])
  @@index([createdAt])
}

// ─── CART ─────────────────────────────────────────────────

model Cart {
  id        String     @id @default(cuid())
  userId    String     @unique
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  items     CartItem[]
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
}

model CartItem {
  id         String  @id @default(cuid())
  cartId     String
  productId  String
  variantId  String?
  quantity   Int
  cart       Cart    @relation(fields: [cartId], references: [id], onDelete: Cascade)
  product    Product @relation(fields: [productId], references: [id])
  variant    ProductVariant? @relation(fields: [variantId], references: [id])

  @@unique([cartId, productId, variantId])
}

// ─── ORDER ────────────────────────────────────────────────

model Order {
  id              String        @id @default(cuid())
  orderCode       String        @unique         // mã hiển thị: #bzf67w81
  userId          String
  shopId          String
  shipperId       String?
  status          OrderStatus   @default(PENDING)
  // ── TIỀN (server-side, không tin client) ──
  subtotal        Int                            // tổng tiền hàng
  shippingFee     Int           @default(0)     // phí giao hàng
  discount        Int           @default(0)     // giảm giá
  total           Int                            // subtotal + shippingFee - discount
  // ── THANH TOÁN ──
  paymentMethod   PaymentMethod @default(COD)
  paymentStatus   PaymentStatus @default(PENDING)
  // ── GIAO HÀNG ──
  shippingName    String
  shippingPhone   String
  shippingAddress String
  note            String?
  scheduledTime   DateTime?                      // thời gian giao hẹn
  // ── META ──
  user            User          @relation(fields: [userId], references: [id])
  shop            Shop          @relation(fields: [shopId], references: [id])
  shipper         User?         @relation(fields: [shipperId], references: [id])
  items           OrderItem[]
  payment         Payment?
  delivery        Delivery?
  review          Review?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([userId])
  @@index([shopId])
  @@index([shipperId])
  @@index([status])
  @@index([paymentStatus])
}

model OrderItem {
  id          String  @id @default(cuid())
  orderId     String
  productId   String
  variantId   String?
  productName String                  // snapshot tên lúc đặt
  unit        String                  // snapshot đơn vị
  price       Int                     // snapshot giá (VND)
  quantity    Int
  subtotal    Int                     // price * quantity
  order       Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product     Product @relation(fields: [productId], references: [id])
  variant     ProductVariant? @relation(fields: [variantId], references: [id])

  @@index([orderId])
}

// ─── PAYMENT ──────────────────────────────────────────────

model Payment {
  id              String        @id @default(cuid())
  orderId         String        @unique
  provider        PaymentMethod
  status          PaymentStatus @default(PENDING)
  amount          Int                          // số tiền (VND)
  txnRef          String        @unique        // mã giao dịch nội bộ
  providerTxnId   String?                      // mã từ VNPay/MoMo
  payUrl          String?                      // URL thanh toán
  webhookCount    Int           @default(0)    // số lần nhận webhook (idempotency)
  paidAt          DateTime?
  rawData         String?                      // log raw callback (debug)
  order           Order         @relation(fields: [orderId], references: [id], onDelete: Cascade)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([status])
  @@index([txnRef])
}

// ─── DELIVERY (giao hàng) ─────────────────────────────────

model Delivery {
  id           String          @id @default(cuid())
  orderId      String          @unique
  shipperId    String?
  status       DeliveryStatus  @default(ASSIGNED)
  pickupTime   DateTime?
  deliverTime  DateTime?
  proofImage   String?                        // ảnh bằng chứng giao
  failReason   String?                        // lý do giao thất bại
  order        Order           @relation(fields: [orderId], references: [id], onDelete: Cascade)
  shipper      User?           @relation(fields: [shipperId], references: [id])
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt

  @@index([shipperId])
  @@index([status])
}

// ─── REVIEW (đánh giá) ────────────────────────────────────

model Review {
  id        String   @id @default(cuid())
  productId String
  orderId   String   @unique                  // 1 đơn 1 review/sp
  userId    String
  rating    Int                                // 1..5
  comment   String?
  images    String[]
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  order     Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  user      User    @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())

  @@index([productId])
  @@index([userId])
}

// ─── WISHLIST (yêu thích) ─────────────────────────────────

model Wishlist {
  id        String  @id @default(cuid())
  userId    String
  productId String
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([userId, productId])
}

// ─── CHAT ─────────────────────────────────────────────────

model Conversation {
  id        String    @id @default(cuid())
  userId    String                     // buyer
  shopId    String                     // seller's shop
  user      User      @relation(fields: [userId], references: [id])
  messages  Message[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  @@unique([userId, shopId])
}

model Message {
  id              String       @id @default(cuid())
  conversationId  String
  senderId        String
  content         String
  imageUrl        String?
  isRead          Boolean      @default(false)
  sender          User         @relation(fields: [senderId], references: [id])
  conversation    Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  createdAt       DateTime     @default(now())

  @@index([conversationId])
  @@index([senderId])
}

// ─── FEEDBACK (phản hồi/khiếu nại) ────────────────────────

model Feedback {
  id        String   @id @default(cuid())
  userId    String
  subject   String
  content   String
  status    String   @default("OPEN")    // OPEN, RESOLVED, CLOSED
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())

  @@index([status])
}
```

---

## §2 CÂY FILE — TẠO MỚI & SỬA

```
zmarketvn-main/
├── AGENTS.md                                    [TẠO] dán §0 từ audit file
├── .env.example                                 [TẠO]
├── next.config.ts                               [SỬA] thêm CSP headers
├── package.json                                 [SỬA] thêm deps
├── prisma/
│   ├── schema.prisma                            [THAY] = §1
│   ├── seed.ts                                  [TẠO] = §14
│   └── migrations/                              [TẠO] qua prisma migrate
├── src/
│   ├── lib/
│   │   ├── prisma.ts                            [SỬA/TẠO] singleton
│   │   ├── auth.ts                              [TẠO] JWT helper
│   │   ├── money.ts                             [TẠO] format + tính tiền
│   │   ├── vnpay.ts                             [TẠO] VNPay SDK
│   │   ├── momo.ts                              [TẠO] MoMo SDK (optional)
│   │   ├── realtime.ts                          [TẠO] Pusher/Ably client
│   │   └── rate-limit.ts                        [TẠO] Upstash ratelimit
│   ├── modules/                                 [TẠO] Modular Monolith
│   │   ├── auth/
│   │   │   ├── service.ts
│   │   │   ├── schema.ts                        (zod)
│   │   │   └── types.ts
│   │   ├── catalog/
│   │   │   ├── service.ts
│   │   │   ├── schema.ts
│   │   │   └── types.ts
│   │   ├── cart/
│   │   │   ├── service.ts
│   │   │   └── schema.ts
│   │   ├── order/
│   │   │   ├── service.ts                       (tính tiền + trừ kho)
│   │   │   ├── schema.ts
│   │   │   └── types.ts
│   │   ├── inventory/
│   │   │   ├── service.ts                       (xuất/nhập kho)
│   │   │   └── schema.ts
│   │   ├── payment/
│   │   │   ├── service.ts
│   │   │   ├── schema.ts
│   │   │   └── vnpay.ts
│   │   ├── delivery/
│   │   │   ├── service.ts
│   │   │   └── schema.ts
│   │   ├── review/
│   │   │   ├── service.ts
│   │   │   └── schema.ts
│   │   └── chat/
│   │       ├── service.ts
│   │       └── schema.ts
│   ├── middleware.ts                            [TẠO] bảo vệ route theo role
│   └── app/
│       ├── layout.tsx                           [SỬA] thêm RealtimeProvider
│       ├── (public)/
│       │   ├── page.tsx                         [SỬA] sửa count-up âm
│       │   ├── san-pham/
│       │   │   ├── page.tsx                     [TẠO] danh sách + filter
│       │   │   └── [id]/
│       │   │       └── page.tsx                 [TẠO] chi tiết SSR + SEO
│       │   └── sap-hang/[id]/page.tsx           [TẠO] trang sạp hàng
│       ├── (auth)/
│       │   ├── dang-nhap/page.tsx               [TẠO] trang login riêng
│       │   └── dang-ky/page.tsx                 [TẠO] trang register riêng
│       ├── (buyer)/
│       │   ├── gio-hang/page.tsx                [TẠO]
│       │   ├── thanh-toan/page.tsx              [TẠO] checkout + payment
│       │   ├── don-hang/page.tsx                [TẠO]
│       │   └── don-hang/[id]/page.tsx           [TẠO] chi tiết đơn
│       ├── (seller)/
│       │   └── seller/
│       │       ├── page.tsx                     [TẠO] dashboard
│       │       ├── san-pham/page.tsx            [TẠO] quản lý SP
│       │       ├── san-pham/moi/page.tsx        [TẠO] form đăng bán
│       │       ├── san-pham/[id]/sua/page.tsx   [TẠO] form sửa
│       │       ├── kho/page.tsx                 [TẠO] quản lý kho ★
│       │       └── don-hang/page.tsx            [TẠO] quản lý đơn
│       ├── (shipper)/
│       │   └── shipper/
│       │       ├── page.tsx                     [TẠO]
│       │       └── don-giao/page.tsx            [TẠO]
│       ├── (admin)/
│       │   └── admin/
│       │       ├── page.tsx                     [TẠO]
│       │       ├── nguoi-dung/page.tsx          [TẠO]
│       │       └── sap-hang/page.tsx            [TẠO]
│       ├── chat/page.tsx                        [TẠO] chat UI
│       └── api/
│           ├── auth/...                         [SỬA] thêm rate-limit
│           ├── cart/...                         [SỬA] validate zod
│           ├── orders/
│           │   ├── route.ts                     [SỬA] tính tiền server
│           │   └── [id]/route.ts                [TẠO] chi tiết + đổi trạng thái
│           ├── payment/
│           │   ├── create/route.ts              [TẠO]
│           │   ├── webhook/vnpay/route.ts       [TẠO]
│           │   └── webhook/momo/route.ts        [TẠO]
│           ├── seller/
│           │   ├── products/route.ts            [SỬA] + [id]/route.ts
│           │   ├── orders/route.ts              [SỬA]
│           │   └── inventory/route.ts           [TẠO] ★
│           ├── shipper/deliveries/route.ts      [SỬA]
│           ├── review/route.ts                  [TẠO]
│           └── ...existing
├── tests/
│   ├── e2e/
│   │   ├── auth.spec.ts                         [TẠO]
│   │   ├── checkout.spec.ts                     [TẺO]
│   │   └── inventory.spec.ts                    [TẠO]
│   └── unit/
│       ├── money.test.ts                        [TẠO]
│       └── inventory.test.ts                    [TẠO]
└── .github/workflows/ci.yml                     [TẠO]
```

---

## §3 LIB — CODE CỐT LÕI

### §3.1 `src/lib/prisma.ts` — Prisma singleton

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### §3.2 `src/lib/auth.ts` — JWT + session helper

```typescript
// src/lib/auth.ts
import { jwtVerify, SignJWT } from 'jose'
import { cookies } from 'next/headers'
import { prisma } from './prisma'
import type { Role, User } from '@prisma/client'

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me')

export interface SessionUser {
  id: string
  email: string
  name: string
  role: Role
  isActive: boolean
}

// ── Tạo token ──
export async function createToken(user: Pick<User, 'id' | 'email' | 'name' | 'role'>): Promise<string> {
  return new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(SECRET)
}

// ── Verify token từ cookie ──
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, SECRET)
    // Kiểm tra user còn active không
    const user = await prisma.user.findUnique({
      where: { id: payload.id as string },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    })
    if (!user || !user.isActive) return null
    return user
  } catch {
    return null
  }
}

// ── Helper cho API route: require + role check ──
export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession()
  if (!session) {
    throw new AuthError(401, 'Chưa đăng nhập')
  }
  return session
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const session = await requireAuth()
  if (!roles.includes(session.role)) {
    throw new AuthError(403, 'Không có quyền truy cập')
  }
  return session
}

export class AuthError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
  }
}

// ── Helper trả JSON error chuẩn ──
import { NextResponse } from 'next/server'
export function errorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message, code: error.statusCode }, { status: error.statusCode })
  }
  if (error instanceof Error) {
    console.error('[API Error]', error)
    return NextResponse.json({ error: 'Lỗi server nội bộ', code: 500 }, { status: 500 })
  }
  return NextResponse.json({ error: 'Lỗi không xác định', code: 500 }, { status: 500 })
}
```

### §3.3 `src/lib/money.ts` — Tiền tệ (VND nguyên)

```typescript
// src/lib/money.ts

/** Format VND sang chuỗi hiển thị: 70000 -> "70.000đ" */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ'
}

/** Parse chuỗi tiền về số nguyên: "70.000đ" -> 70000 */
export function parseVND(s: string): number {
  return parseInt(s.replace(/[^\d]/g, ''), 10) || 0
}

/**
 * Tính tổng đơn hàng — CHỈ chạy ở server.
 * subtotal = sum(item.price * item.quantity)
 * total = subtotal + shippingFee - discount
 */
export interface OrderCalculation {
  subtotal: number
  shippingFee: number
  discount: number
  total: number
}

export function calculateOrderTotal(
  items: { price: number; quantity: number }[],
  shippingFee: number = 0,
  discount: number = 0,
): OrderCalculation {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const total = subtotal + shippingFee - discount
  // Đảm bảo không âm
  return {
    subtotal: Math.max(0, subtotal),
    shippingFee: Math.max(0, shippingFee),
    discount: Math.max(0, discount),
    total: Math.max(0, total),
  }
}

/** Tính phí ship cơ bản theo trọng lượng (ví dụ) */
export function calculateShippingFee(weightGram: number, distanceKm: number = 5): number {
  const baseFee = 15000          // phí nền 15.000đ
  const perKgFee = 2000          // +2.000đ/kg
  const perKmFee = 1000          // +1.000đ/km (simplified)
  const weightKg = Math.ceil(weightGram / 1000)
  return baseFee + weightKg * perKgFee + Math.ceil(distanceKm) * perKmFee
}
```

### §3.4 `src/lib/vnpay.ts` — VNPay tích hợp

```typescript
// src/lib/vnpay.ts
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
```

### §3.5 `src/lib/rate-limit.ts` — Rate limiting

```typescript
// src/lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

/**
 * Rate limiter dùng Upstash Redis (Vercel-friendly).
 * Nếu chưa có UPSTASH_REDIS_REST_URL/TOKEN, fallback no-limit (dev).
 */

let limiter: Ratelimit | null = null

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  limiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, '1 m'),   // 10 requests / phút
    analytics: true,
  })
}

export async function rateLimit(identifier: string): Promise<{ success: boolean; remaining: number }> {
  if (!limiter) return { success: true, remaining: 999 }  // dev fallback
  const result = await limiter.limit(identifier)
  return { success: result.success, remaining: result.remaining }
}

/** Rate limit cho auth: 5 lần/phút per IP */
export async function rateLimitAuth(ip: string): Promise<{ success: boolean; remaining: number }> {
  if (!limiter) return { success: true, remaining: 999 }
  const result = await limiter.limit(`auth:${ip}`)
  return { success: result.success, remaining: result.remaining }
}
```

### §3.6 `src/lib/realtime.ts` — Pusher/Ably (thay Socket.IO)

```typescript
// src/lib/realtime.ts
/**
 * Thay Socket.IO bằng Pusher Channels.
 * Server push event qua Pusher, client subscribe qua pusher-js.
 *
 * Cài: pnpm add pusher pusher-js
 * Env: PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER
 * Hoặc dùng Ably: pnpm add ably
 */

import Pusher from 'pusher'

let pusherInstance: Pusher | null = null

export function getPusher(): Pusher | null {
  if (!pusherInstance && process.env.PUSHER_APP_ID) {
    pusherInstance = new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.PUSHER_CLUSTER || 'ap1',
      useTLS: true,
    })
  }
  return pusherInstance
}

/** Gửi tin nhắn chat realtime */
export async function pushChatMessage(conversationId: string, message: unknown) {
  const pusher = getPusher()
  if (!pusher) {
    console.warn('[Realtime] Pusher not configured — message saved to DB only')
    return
  }
  await pusher.trigger(`chat-${conversationId}`, 'new-message', message)
}

/** Gửi cập nhật trạng thái đơn hàng realtime */
export async function pushOrderUpdate(orderId: string, status: string) {
  const pusher = getPusher()
  if (!pusher) return
  await pusher.trigger(`order-${orderId}`, 'status-update', { orderId, status, timestamp: Date.now() })
}

// ── Client-side hook (dùng trong component) ──
// src/lib/realtime-client.ts
/*
import Pusher from 'pusher-js'

export function createPusherClient() {
  return new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap1',
  })
}
*/
```---

## §4 MIDDLEWARE — BẢO VỆ ROUTE THEO ROLE

### `src/middleware.ts`

```typescript
// src/middleware.ts
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
```

---

## §5 MODULES — SERVICE LAYER (Modular Monolith)

> Nguyên tắc: `app/api/**/route.ts` chỉ gọi vào `modules/*/service.ts`. Service chứa logic nghiệp vụ. Repo chứa truy vấn Prisma. Schema chứa zod validation.

### §5.1 `src/modules/order/service.ts` — TÍNH TIỀN + TRỪ KHO (P0-4, P1-1)

```typescript
// src/modules/order/service.ts
import { prisma } from '@/lib/prisma'
import { calculateOrderTotal } from '@/lib/money'
import { pushOrderUpdate } from '@/lib/realtime'
import type { Order, OrderItem, Prisma } from '@prisma/client'

/**
 * Tạo đơn hàng — CHẠY TRONG TRANSACTION.
 * 1. Validate sản phẩm + variant tồn tại & còn hàng
 * 2. Tính tiền ở SERVER (không tin client)
 * 3. Trừ kho + ghi StockMovement
 * 4. Tạo Order + OrderItem + (Payment nếu COD)
 */
export async function createOrder(params: {
  userId: string
  items: { productId: string; variantId?: string; quantity: number }[]
  shippingName: string
  shippingPhone: string
  shippingAddress: string
  paymentMethod: 'COD' | 'VNPAY' | 'MOMO'
  note?: string
  scheduledTime?: Date
}): Promise<{ order: Order; paymentUrl?: string }> {
  return prisma.$transaction(async (tx) => {
    // ── 1. Validate + snapshot sản phẩm ──
    const orderItems: {
      productId: string
      variantId: string | null
      productName: string
      unit: string
      price: number
      quantity: number
      subtotal: number
      weightGram: number
    }[] = []

    let shopId: string | null = null
    let totalWeight = 0

    for (const item of params.items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        include: { shop: true },
      })
      if (!product || !product.isActive) {
        throw new ServiceError(400, `Sản phẩm không tồn tại hoặc đã ngừng bán: ${item.productId}`)
      }
      if (shopId && product.shopId !== shopId) {
        throw new ServiceError(400, 'Không thể đặt hàng từ nhiều sạp khác nhau trong 1 đơn')
      }
      shopId = product.shopId

      let price = product.price
      let stock = product.stockQuantity
      let variantId: string | null = null

      if (item.variantId) {
        const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } })
        if (!variant || variant.productId !== product.id) {
          throw new ServiceError(400, 'Biến thể không hợp lệ')
        }
        price = variant.price
        stock = variant.stockQuantity
        variantId = variant.id
      }

      // ── Kiểm tra kho ──
      if (stock < item.quantity) {
        throw new ServiceError(400, `Không đủ hàng: ${product.name} (còn ${stock} ${product.unit})`)
      }

      const itemSubtotal = price * item.quantity
      totalWeight += (product.weightGram || 500) * item.quantity

      orderItems.push({
        productId: product.id,
        variantId,
        productName: product.name,
        unit: product.unit,
        price,
        quantity: item.quantity,
        subtotal: itemSubtotal,
        weightGram: product.weightGram || 500,
      })

      // ── Trừ kho ──
      if (variantId) {
        await tx.productVariant.update({
          where: { id: variantId },
          data: { stockQuantity: { decrement: item.quantity } },
        })
      } else {
        await tx.product.update({
          where: { id: product.id },
          data: {
            stockQuantity: { decrement: item.quantity },
            soldCount: { increment: item.quantity },
          },
        })
      }

      // ── Ghi StockMovement ──
      await tx.stockMovement.create({
        data: {
          productId: product.id,
          variantId,
          delta: -item.quantity,
          reason: 'SALE',
          userId: params.userId,
        },
      })
    }

    if (!shopId) throw new ServiceError(400, 'Không có sản phẩm hợp lệ')

    // ── 2. Tính tiền SERVER ──
    const shippingFee = calculateShippingFeeByWeight(totalWeight)
    const calc = calculateOrderTotal(
      orderItems.map((i) => ({ price: i.price, quantity: i.quantity })),
      shippingFee,
      0, // discount
    )

    // ── 3. Tạo Order ──
    const orderCode = generateOrderCode()
    const order = await tx.order.create({
      data: {
        orderCode,
        userId: params.userId,
        shopId,
        status: 'PENDING',
        subtotal: calc.subtotal,
        shippingFee: calc.shippingFee,
        discount: calc.discount,
        total: calc.total,
        paymentMethod: params.paymentMethod,
        paymentStatus: params.paymentMethod === 'COD' ? 'PENDING' : 'PENDING',
        shippingName: params.shippingName,
        shippingPhone: params.shippingPhone,
        shippingAddress: params.shippingAddress,
        note: params.note,
        scheduledTime: params.scheduledTime,
        items: {
          create: orderItems.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            productName: i.productName,
            unit: i.unit,
            price: i.price,
            quantity: i.quantity,
            subtotal: i.subtotal,
          })),
        },
      },
      include: { items: true },
    })

    // ── 4. Payment ──
    let paymentUrl: string | undefined
    if (params.paymentMethod === 'VNPAY') {
      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          provider: 'VNPAY',
          status: 'PENDING',
          amount: calc.total,
          txnRef: orderCode,
        },
      })
      // Tạo URL VNPay (xem §3.4)
      const { createVnpayPaymentUrl } = await import('@/lib/vnpay')
      paymentUrl = createVnpayPaymentUrl({
        txnRef: payment.txnRef,
        amount: calc.total,
        orderInfo: `Thanh toan don hang ${orderCode}`,
      })
      await tx.payment.update({ where: { id: payment.id }, data: { payUrl: paymentUrl } })
    } else if (params.paymentMethod === 'COD') {
      await tx.payment.create({
        data: {
          orderId: order.id,
          provider: 'COD',
          status: 'PENDING',
          amount: calc.total,
          txnRef: orderCode,
        },
      })
    }

    // ── 5. Tạo Delivery record ──
    await tx.delivery.create({
      data: { orderId: order.id, status: 'ASSIGNED' },
    })

    // ── 6. Push realtime ──
    await pushOrderUpdate(order.id, 'PENDING')

    return { order, paymentUrl }
  })
}

/**
 * Huỷ đơn hàng — CỘNG LẠI KHO trong transaction.
 */
export async function cancelOrder(orderId: string, userId: string, reason?: string): Promise<Order> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    })
    if (!order) throw new ServiceError(404, 'Không tìm thấy đơn hàng')
    if (order.userId !== userId) throw new ServiceError(403, 'Không có quyền')
    if (order.status === 'DELIVERED') throw new ServiceError(400, 'Không thể huỷ đơn đã giao')
    if (order.status === 'CANCELLED') throw new ServiceError(400, 'Đơn đã huỷ')

    // Cộng lại kho
    for (const item of order.items) {
      if (item.variantId) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stockQuantity: { increment: item.quantity } },
        })
      } else {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: { increment: item.quantity },
            soldCount: { decrement: item.quantity },
          },
        })
      }
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          variantId: item.variantId,
          delta: item.quantity,
          reason: 'CANCEL',
          orderId: order.id,
          userId,
          note: reason,
        },
      })
    }

    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
    })

    await pushOrderUpdate(orderId, 'CANCELLED')
    return updated
  })
}

/**
 * Đổi trạng thái đơn (seller/shipper/admin).
 */
export async function updateOrderStatus(
  orderId: string,
  status: 'PREPARING' | 'READY' | 'DELIVERING' | 'DELIVERED',
  actorId: string,
): Promise<Order> {
  const order = await prisma.order.update({
    where: { id: orderId },
    data: { status },
  })
  await pushOrderUpdate(orderId, status)
  return order
}

// ── Helpers ──
export class ServiceError extends Error {
  constructor(public statusCode: number, message: string) { super(message) }
}

function generateOrderCode(): string {
  return Math.random().toString(36).slice(2, 10)
}

function calculateShippingFeeByWeight(weightGram: number): number {
  const baseFee = 15000
  const perKg = 2000
  const weightKg = Math.ceil(weightGram / 1000)
  return baseFee + weightKg * perKg
}
```

### §5.2 `src/modules/order/schema.ts` — Zod validation

```typescript
// src/modules/order/schema.ts
import { z } from 'zod'

export const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1),
    variantId: z.string().optional(),
    quantity: z.number().int().positive().max(999),
  })).min(1, 'Phải có ít nhất 1 sản phẩm'),
  shippingName: z.string().min(2, 'Tên quá ngắn'),
  shippingPhone: z.string().regex(/^0\d{9,10}$/, 'Số điện thoại không hợp lệ'),
  shippingAddress: z.string().min(5, 'Địa chỉ quá ngắn'),
  paymentMethod: z.enum(['COD', 'VNPAY', 'MOMO']),
  note: z.string().max(500).optional(),
  scheduledTime: z.string().datetime().optional(),
})

export const cancelOrderSchema = z.object({
  reason: z.string().max(500).optional(),
})

export const updateStatusSchema = z.object({
  status: z.enum(['PREPARING', 'READY', 'DELIVERING', 'DELIVERED']),
})
```

### §5.3 `src/modules/inventory/service.ts` — QUẢN LÝ KHO (P1-1)

```typescript
// src/modules/inventory/service.ts
import { prisma } from '@/lib/prisma'
import { ServiceError } from '../order/service'

/** Nhập kho: tăng stockQuantity + ghi StockMovement IMPORT */
export async function importStock(params: {
  productId: string
  variantId?: string
  quantity: number
  note?: string
  userId: string
}) {
  if (params.quantity <= 0) throw new ServiceError(400, 'Số lượng nhập phải > 0')

  return prisma.$transaction(async (tx) => {
    if (params.variantId) {
      await tx.productVariant.update({
        where: { id: params.variantId },
        data: { stockQuantity: { increment: params.quantity } },
      })
    } else {
      await tx.product.update({
        where: { id: params.productId },
        data: { stockQuantity: { increment: params.quantity } },
      })
    }

    return tx.stockMovement.create({
      data: {
        productId: params.productId,
        variantId: params.variantId,
        delta: params.quantity,
        reason: 'IMPORT',
        note: params.note,
        userId: params.userId,
      },
    })
  })
}

/** Điều chỉnh kho (set số lượng tuyệt đối) + ghi ADJUST */
export async function adjustStock(params: {
  productId: string
  variantId?: string
  newQuantity: number
  note?: string
  userId: string
}) {
  if (params.newQuantity < 0) throw new ServiceError(400, 'Tồn kho không thể âm')

  return prisma.$transaction(async (tx) => {
    let oldQuantity: number
    if (params.variantId) {
      const v = await tx.productVariant.findUnique({ where: { id: params.variantId } })
      if (!v) throw new ServiceError(404, 'Không tìm thấy biến thể')
      oldQuantity = v.stockQuantity
      await tx.productVariant.update({
        where: { id: params.variantId },
        data: { stockQuantity: params.newQuantity },
      })
    } else {
      const p = await tx.product.findUnique({ where: { id: params.productId } })
      if (!p) throw new ServiceError(404, 'Không tìm thấy sản phẩm')
      oldQuantity = p.stockQuantity
      await tx.product.update({
        where: { id: params.productId },
        data: { stockQuantity: params.newQuantity },
      })
    }

    const delta = params.newQuantity - oldQuantity
    return tx.stockMovement.create({
      data: {
        productId: params.productId,
        variantId: params.variantId,
        delta,
        reason: 'ADJUST',
        note: params.note || `Điều chỉnh từ ${oldQuantity} → ${params.newQuantity}`,
        userId: params.userId,
      },
    })
  })
}

/** Lấy danh sách sản phẩm sắp hết hàng (seller) */
export async function getLowStockProducts(shopId: string) {
  return prisma.product.findMany({
    where: {
      shopId,
      isActive: true,
      stockQuantity: { lte: prisma.product.fields.lowStockThreshold },
    },
    include: { variants: true, category: true },
    orderBy: { stockQuantity: 'asc' },
  })
}

/** Lịch sử xuất/nhập kho của 1 sản phẩm */
export async function getStockHistory(productId: string, limit = 50) {
  return prisma.stockMovement.findMany({
    where: { productId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}
```

### §5.4 `src/modules/inventory/schema.ts`

```typescript
// src/modules/inventory/schema.ts
import { z } from 'zod'

export const importStockSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional(),
  quantity: z.number().int().positive().max(100000),
  note: z.string().max(500).optional(),
})

export const adjustStockSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional(),
  newQuantity: z.number().int().min(0).max(100000),
  note: z.string().max(500).optional(),
})
```

### §5.5 `src/modules/payment/service.ts` — XỬ LÝ WEBHOOK (P0-3)

```typescript
// src/modules/payment/service.ts
import { prisma } from '@/lib/prisma'
import { verifyVnpayCallback } from '@/lib/vnpay'
import { pushOrderUpdate } from '@/lib/realtime'
import { ServiceError } from '../order/service'

/**
 * Xử lý VNPay IPN webhook — IDEMPOTENT.
 * Gọi nhiều lần không cộng tiền 2 lần.
 */
export async function handleVnpayWebhook(queryParams: Record<string, string>) {
  const verify = verifyVnpayCallback(queryParams)

  if (!verify.isValid) {
    return { RspCode: '97', Message: 'Checksum failed' }
  }

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { txnRef: verify.txnRef },
      include: { order: true },
    })

    if (!payment) {
      return { RspCode: '01', Message: 'Order not found' }
    }

    // ── IDEMPOTENCY: nếu đã PAID rồi, trả OK nhưng không làm gì ──
    if (payment.status === 'PAID') {
      return { RspCode: '00', Message: 'Confirm Success' }
    }

    // Tăng webhook count
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        webhookCount: { increment: 1 },
        providerTxnId: queryParams['vnp_BankTranNo'],
        rawData: JSON.stringify(queryParams),
      },
    })

    // ResponseCode 00 = thành công
    if (verify.responseCode === '00') {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'PAID', paidAt: new Date() },
      })
      await tx.order.update({
        where: { id: payment.orderId },
        data: { paymentStatus: 'PAID' },
      })
      await pushOrderUpdate(payment.orderId, 'PAID')
    } else {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      })
      await tx.order.update({
        where: { id: payment.orderId },
        data: { paymentStatus: 'FAILED' },
      })
    }

    return { RspCode: '00', Message: 'Confirm Success' }
  })
}
```

### §5.6 `src/modules/catalog/service.ts` — SẢN PHẨM + ĐĂNG BÁN (P1-2)

```typescript
// src/modules/catalog/service.ts
import { prisma } from '@/lib/prisma'
import { ServiceError } from '../order/service'

/** Tạo sản phẩm mới (seller đăng bán) */
export async function createProduct(params: {
  sellerId: string
  name: string
  description?: string
  longDescription?: string
  price: number
  originalPrice?: number
  unit: string
  stockQuantity: number
  sku?: string
  images: string[]
  categoryId: string
  weightGram?: number
  origin?: string
  storageInfo?: string
  variants?: { name: string; price: number; stockQuantity: number; sku?: string }[]
}) {
  const shop = await prisma.shop.findUnique({ where: { ownerId: params.sellerId } })
  if (!shop) throw new ServiceError(404, 'Bạn chưa có sạp hàng')

  if (params.price <= 0) throw new ServiceError(400, 'Giá phải > 0')
  if (params.stockQuantity < 0) throw new ServiceError(400, 'Tồn kho không thể âm')
  if (params.images.length === 0) throw new ServiceError(400, 'Phải có ít nhất 1 ảnh')

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        name: params.name,
        description: params.description,
        longDescription: params.longDescription,
        price: params.price,
        originalPrice: params.originalPrice,
        unit: params.unit,
        stockQuantity: params.stockQuantity,
        sku: params.sku,
        images: params.images,
        categoryId: params.categoryId,
        weightGram: params.weightGram,
        origin: params.origin,
        storageInfo: params.storageInfo,
        shopId: shop.id,
        isActive: true,
      },
    })

    // Tạo variants nếu có
    if (params.variants && params.variants.length > 0) {
      await tx.productVariant.createMany({
        data: params.variants.map((v) => ({
          productId: product.id,
          name: v.name,
          price: v.price,
          stockQuantity: v.stockQuantity,
          sku: v.sku,
        })),
      })
    }

    // Ghi StockMovement IMPORT ban đầu
    if (params.stockQuantity > 0) {
      await tx.stockMovement.create({
        data: {
          productId: product.id,
          delta: params.stockQuantity,
          reason: 'IMPORT',
          userId: params.sellerId,
          note: 'Nhập kho ban đầu',
        },
      })
    }

    return product
  })
}

/** Cập nhật sản phẩm */
export async function updateProduct(productId: string, sellerId: string, data: {
  name?: string
  description?: string
  longDescription?: string
  price?: number
  originalPrice?: number
  unit?: string
  images?: string[]
  categoryId?: string
  weightGram?: number
  origin?: string
  storageInfo?: string
  isActive?: boolean
}) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { shop: true },
  })
  if (!product) throw new ServiceError(404, 'Không tìm thấy sản phẩm')
  if (product.shop.ownerId !== sellerId) throw new ServiceError(403, 'Không có quyền')

  return prisma.product.update({ where: { id: productId }, data })
}

/** Lấy chi tiết sản phẩm (SSR cho trang /san-pham/[id]) */
export async function getProductDetail(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId, isActive: true },
    include: {
      shop: true,
      category: true,
      variants: true,
      reviews: {
        include: { user: { select: { name: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  })
  if (!product) throw new ServiceError(404, 'Không tìm thấy sản phẩm')
  return product
}
```

### §5.7 `src/modules/review/service.ts` — ĐÁNH GIÁ (P1-3)

```typescript
// src/modules/review/service.ts
import { prisma } from '@/lib/prisma'
import { ServiceError } from '../order/service'

/** Tạo đánh giá — chỉ khi đơn DELIVERED (verified purchase) */
export async function createReview(params: {
  userId: string
  productId: string
  orderId: string
  rating: number    // 1..5
  comment?: string
  images?: string[]
}) {
  if (params.rating < 1 || params.rating > 5) throw new ServiceError(400, 'Rating 1-5')

  return prisma.$transaction(async (tx) => {
    // Kiểm tra đơn hàng đã giao + thuộc user + có sản phẩm này
    const order = await tx.order.findFirst({
      where: {
        id: params.orderId,
        userId: params.userId,
        status: 'DELIVERED',
        items: { some: { productId: params.productId } },
      },
    })
    if (!order) throw new ServiceError(403, 'Chỉ đánh giá được khi đã nhận hàng')

    // Kiểm tra chưa review sp này cho đơn này
    const existing = await tx.review.findUnique({ where: { orderId: params.orderId } })
    if (existing) throw new ServiceError(400, 'Bạn đã đánh giá đơn hàng này')

    // Tạo review
    const review = await tx.review.create({
      data: {
        productId: params.productId,
        orderId: params.orderId,
        userId: params.userId,
        rating: params.rating,
        comment: params.comment,
        images: params.images || [],
      },
    })

    // Cập nhật rating trung bình sản phẩm
    const agg = await tx.review.aggregate({
      where: { productId: params.productId },
      _avg: { rating: true },
      _count: true,
    })
    await tx.product.update({
      where: { id: params.productId },
      data: {
        rating: agg._avg.rating || 0,
        reviewCount: agg._count,
      },
    })

    // Cập nhật rating shop
    const shopAgg = await tx.product.aggregate({
      where: { shopId: order.shopId },
      _avg: { rating: true },
    })
    const shopReviewCount = await tx.review.count({
      where: { product: { shopId: order.shopId } },
    })
    await tx.shop.update({
      where: { id: order.shopId },
      data: { rating: shopAgg._avg.rating || 0, reviewCount: shopReviewCount },
    })

    return review
  })
}
```---

## §6 API ROUTES — CHUYỂN TỪ SERVICE LAYER

### §6.1 `src/app/api/orders/route.ts` — Tạo đơn (P0-3, P0-4)

```typescript
// src/app/api/orders/route.ts
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { errorResponse } from '@/lib/auth'
import { createOrderSchema } from '@/modules/order/schema'
import { createOrder, ServiceError } from '@/modules/order/service'

export async function POST(request: Request) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const parsed = createOrderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }
    const result = await createOrder({ ...parsed.data, userId: session.id })
    return NextResponse.json({ order: result.order, paymentUrl: result.paymentUrl }, { status: 201 })
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return errorResponse(error)
  }
}

// GET — list orders của user hiện tại
export async function GET() {
  try {
    const session = await requireAuth()
    const { prisma } = await import('@/lib/prisma')
    const orders = await prisma.order.findMany({
      where: { userId: session.id },
      include: { items: true, shop: { select: { name: true, image: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ orders })
  } catch (error) {
    return errorResponse(error)
  }
}
```

### §6.2 `src/app/api/orders/[id]/route.ts` — Chi tiết + đổi trạng thái

```typescript
// src/app/api/orders/[id]/route.ts
import { NextResponse } from 'next/server'
import { requireAuth, requireRole, errorResponse } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cancelOrder, updateOrderStatus, ServiceError } from '@/modules/order/service'
import { cancelOrderSchema, updateStatusSchema } from '@/modules/order/schema'

// GET — chi tiết đơn
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth()
    const { id } = await params
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, shop: true, payment: true, delivery: true },
    })
    if (!order) throw new ServiceError(404, 'Không tìm thấy đơn')
    // Buyer chỉ xem đơn của mình; seller chỉ xem đơn sạp mình; admin xem tất cả
    if (session.role === 'BUYER' && order.userId !== session.id) {
      throw new ServiceError(403, 'Không có quyền')
    }
    return NextResponse.json({ order })
  } catch (error) {
    if (error instanceof ServiceError) return NextResponse.json({ error: error.message }, { status: error.statusCode })
    return errorResponse(error)
  }
}

// PATCH — đổi trạng thái (seller/shipper/admin)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireRole('SELLER', 'SHIPPER', 'ADMIN')
    const { id } = await params
    const body = await request.json()
    const parsed = updateStatusSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Trạng thái không hợp lệ' }, { status: 400 })
    }
    const order = await updateOrderStatus(id, parsed.data.status, session.id)
    return NextResponse.json({ order })
  } catch (error) {
    if (error instanceof ServiceError) return NextResponse.json({ error: error.message }, { status: error.statusCode })
    return errorResponse(error)
  }
}

// DELETE — huỷ đơn (buyer)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth()
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const parsed = cancelOrderSchema.safeParse(body)
    const order = await cancelOrder(id, session.id, parsed.success ? parsed.data.reason : undefined)
    return NextResponse.json({ order })
  } catch (error) {
    if (error instanceof ServiceError) return NextResponse.json({ error: error.message }, { status: error.statusCode })
    return errorResponse(error)
  }
}
```

### §6.3 `src/app/api/payment/create/route.ts` — Tạo thanh toán

```typescript
// src/app/api/payment/create/route.ts
import { NextResponse } from 'next/server'
import { requireAuth, errorResponse } from '@/lib/auth'
import { createVnpayPaymentUrl } from '@/lib/vnpay'
import { prisma } from '@/lib/prisma'

// POST /api/payment/create — tạo URL thanh toán VNPay cho đơn đã có
export async function POST(request: Request) {
  try {
    const session = await requireAuth()
    const { orderId } = await request.json()

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    })
    if (!order) return NextResponse.json({ error: 'Không tìm thấy đơn' }, { status: 404 })
    if (order.userId !== session.id) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
    if (order.paymentStatus === 'PAID') return NextResponse.json({ error: 'Đơn đã thanh toán' }, { status: 400 })

    const paymentUrl = createVnpayPaymentUrl({
      txnRef: order.orderCode,
      amount: order.total,
      orderInfo: `Thanh toan don hang ${order.orderCode}`,
    })

    if (order.payment) {
      await prisma.payment.update({
        where: { orderId },
        data: { payUrl: paymentUrl, provider: 'VNPAY' },
      })
    }

    return NextResponse.json({ paymentUrl })
  } catch (error) {
    return errorResponse(error)
  }
}
```

### §6.4 `src/app/api/payment/webhook/vnpay/route.ts` — Webhook IPN

```typescript
// src/app/api/payment/webhook/vnpay/route.ts
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
```

### §6.5 `src/app/api/seller/inventory/route.ts` — API KHO (P1-1)

```typescript
// src/app/api/seller/inventory/route.ts
import { NextResponse } from 'next/server'
import { requireRole, errorResponse } from '@/lib/auth'
import { importStockSchema, adjustStockSchema } from '@/modules/inventory/schema'
import { importStock, adjustStock, getLowStockProducts, getStockHistory } from '@/modules/inventory/service'
import { prisma } from '@/lib/prisma'

// GET — danh sách kho + sắp hết
export async function GET(request: Request) {
  try {
    const session = await requireRole('SELLER')
    const shop = await prisma.shop.findUnique({ where: { ownerId: session.id } })
    if (!shop) return NextResponse.json({ error: 'Chưa có sạp' }, { status: 404 })

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter')

    if (filter === 'low-stock') {
      const products = await getLowStockProducts(shop.id)
      return NextResponse.json({ products })
    }

    if (searchParams.get('productId')) {
      const history = await getStockHistory(searchParams.get('productId')!)
      return NextResponse.json({ history })
    }

    const products = await prisma.product.findMany({
      where: { shopId: shop.id },
      include: { variants: true, category: true },
      orderBy: { stockQuantity: 'asc' },
    })
    return NextResponse.json({ products })
  } catch (error) {
    return errorResponse(error)
  }
}

// POST — nhập kho
export async function POST(request: Request) {
  try {
    const session = await requireRole('SELLER')
    const body = await request.json()
    const parsed = importStockSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ', fields: parsed.error.flatten() }, { status: 400 })
    }
    const movement = await importStock({ ...parsed.data, userId: session.id })
    return NextResponse.json({ movement }, { status: 201 })
  } catch (error) {
    return errorResponse(error)
  }
}

// PATCH — điều chỉnh kho
export async function PATCH(request: Request) {
  try {
    const session = await requireRole('SELLER')
    const body = await request.json()
    const parsed = adjustStockSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 })
    }
    const movement = await adjustStock({ ...parsed.data, userId: session.id })
    return NextResponse.json({ movement })
  } catch (error) {
    return errorResponse(error)
  }
}
```

### §6.6 `src/app/api/review/route.ts` — API đánh giá (P1-3)

```typescript
// src/app/api/review/route.ts
import { NextResponse } from 'next/server'
import { requireAuth, errorResponse } from '@/lib/auth'
import { createReview, ServiceError } from '@/modules/review/service'
import { z } from 'zod'

const reviewSchema = z.object({
  productId: z.string().min(1),
  orderId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
  images: z.array(z.string().url()).max(5).optional(),
})

export async function POST(request: Request) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const parsed = reviewSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ', fields: parsed.error.flatten() }, { status: 400 })
    }
    const review = await createReview({ ...parsed.data, userId: session.id })
    return NextResponse.json({ review }, { status: 201 })
  } catch (error) {
    if (error instanceof ServiceError) return NextResponse.json({ error: error.message }, { status: error.statusCode })
    return errorResponse(error)
  }
}
```

### §6.7 `src/app/api/auth/login/route.ts` — Sửa: thêm rate-limit (P1-6)

```typescript
// src/app/api/auth/login/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createToken } from '@/lib/auth'
import { rateLimitAuth } from '@/lib/rate-limit'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(request: Request) {
  try {
    // ── Rate limit ──
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const rl = await rateLimitAuth(ip)
    if (!rl.success) {
      return NextResponse.json({ error: 'Quá nhiều lần thử, vui lòng đợi 1 phút' }, { status: 429 })
    }

    const body = await request.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Email/mật khẩu không hợp lệ' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } })
    if (!user || !user.password || !user.isActive) {
      return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng' }, { status: 401 })
    }

    const valid = await bcrypt.compare(parsed.data.password, user.password)
    if (!valid) {
      return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng' }, { status: 401 })
    }

    const token = await createToken(user)
    const res = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, message: 'Đăng nhập thành công' })
    res.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 ngày
      path: '/',
    })
    return res
  } catch (error) {
    console.error('[Login Error]', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
```

---

## §7 TRANG CHECKOUT — `src/app/(buyer)/thanh-toan/page.tsx` (P0-3)

```tsx
// src/app/(buyer)/thanh-toan/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/hooks/useCart'
import { formatVND } from '@/lib/money'

export default function CheckoutPage() {
  const router = useRouter()
  const { cart, loading } = useCart()
  const [form, setForm] = useState({
    shippingName: '',
    shippingPhone: '',
    shippingAddress: '',
    paymentMethod: 'COD' as 'COD' | 'VNPAY',
    note: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (loading) return <div className="p-8 text-center">Đang tải...</div>
  if (!cart || cart.items.length === 0) {
    return <div className="p-8 text-center">Giỏ hàng trống. <a href="/san-pham" className="text-green-600 underline">Mua sắm ngay</a></div>
  }

  const subtotal = cart.items.reduce((s, i) => s + i.product.price * i.quantity, 0)
  const shippingFee = 15000
  const total = subtotal + shippingFee

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
          })),
          ...form,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Lỗi đặt hàng')
      if (data.paymentUrl) {
        // Redirect sang VNPay
        window.location.href = data.paymentUrl
      } else {
        // COD — về trang đơn hàng
        router.push(`/don-hang/${data.order.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl font-bold mb-6">Thanh toán</h1>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Họ tên người nhận *</label>
          <input
            type="text" required minLength={2}
            value={form.shippingName}
            onChange={(e) => setForm({ ...form, shippingName: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Số điện thoại *</label>
          <input
            type="tel" required pattern="0\d{9,10}"
            value={form.shippingPhone}
            onChange={(e) => setForm({ ...form, shippingPhone: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Địa chỉ giao hàng *</label>
          <textarea
            required minLength={5}
            value={form.shippingAddress}
            onChange={(e) => setForm({ ...form, shippingAddress: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Phương thức thanh toán *</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 border rounded p-3 cursor-pointer">
              <input type="radio" checked={form.paymentMethod === 'COD'} onChange={() => setForm({ ...form, paymentMethod: 'COD' })} />
              <span>💵 Thanh toán khi nhận hàng (COD)</span>
            </label>
            <label className="flex items-center gap-2 border rounded p-3 cursor-pointer">
              <input type="radio" checked={form.paymentMethod === 'VNPAY'} onChange={() => setForm({ ...form, paymentMethod: 'VNPAY' })} />
              <span>🏦 VNPay (thẻ ATM / QR / ví)</span>
            </label>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Ghi chú (tuỳ chọn)</label>
          <input
            type="text" maxLength={500}
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {/* Tóm tắt tiền */}
        <div className="border-t pt-4 space-y-1">
          <div className="flex justify-between"><span>Tiền hàng:</span><span>{formatVND(subtotal)}</span></div>
          <div className="flex justify-between"><span>Phí giao hàng:</span><span>{formatVND(shippingFee)}</span></div>
          <div className="flex justify-between font-bold text-lg pt-2 border-t"><span>Tổng cộng:</span><span className="text-green-600">{formatVND(total)}</span></div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-green-600 text-white py-3 rounded font-bold disabled:opacity-50"
        >
          {submitting ? 'Đang xử lý...' : form.paymentMethod === 'COD' ? 'Đặt hàng' : 'Thanh toán qua VNPay'}
        </button>
      </form>
    </div>
  )
}
```

---

## §8 TRANG CHI TIẾT SẢN PHẨM — `src/app/(public)/san-pham/[id]/page.tsx` (P0-2, P1-2)

```tsx
// src/app/(public)/san-pham/[id]/page.tsx
import { notFound } from 'next/navigation'
import { getProductDetail } from '@/modules/catalog/service'
import { formatVND } from '@/lib/money'
import { AddToCartButton } from '@/components/AddToCartButton'
import { ReviewSection } from '@/components/ReviewSection'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  try {
    const product = await getProductDetail(id)
    return {
      title: `${product.name} — ${formatVND(product.price)} | Z-Market`,
      description: product.description || `Mua ${product.name} tươi ngon giao tận nơi`,
      openGraph: {
        title: product.name,
        description: product.description || '',
        images: product.images.map((url) => ({ url, width: 800, height: 600 })),
        type: 'website',
      },
    }
  } catch {
    return { title: 'Sản phẩm không tìm thấy | Z-Market' }
  }
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let product
  try {
    product = await getProductDetail(id)
  } catch {
    notFound()
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Gallery ảnh */}
        <div className="space-y-3">
          <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {product.images.map((url, i) => (
                <img key={i} src={url} alt={`${product.name} ${i + 1}`} className="w-20 h-20 rounded object-cover border" />
              ))}
            </div>
          )}
        </div>

        {/* Thông tin */}
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">{product.name}</h1>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-green-600">{formatVND(product.price)}</span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-lg text-gray-400 line-through">{formatVND(product.originalPrice)}</span>
            )}
          </div>
          <div className="text-sm text-gray-600">
            <span>Đã bán: {product.soldCount}</span>
            <span className="mx-2">·</span>
            <span>⭐ {product.rating.toFixed(1)} ({product.reviewCount} đánh giá)</span>
          </div>
          <div className="text-sm">
            <span className="font-medium">Đơn vị:</span> {product.unit}
            {product.origin && <><span className="mx-2">·</span><span className="font-medium">Xuất xứ:</span> {product.origin}</>}
          </div>
          {product.storageInfo && (
            <div className="text-sm bg-amber-50 p-3 rounded">
              <span className="font-medium">Bảo quản:</span> {product.storageInfo}
            </div>
          )}
          {product.description && <p className="text-gray-700">{product.description}</p>}
          {product.longDescription && (
            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: product.longDescription }} />
          )}

          {/* Biến thể */}
          {product.variants.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">Phân loại:</h3>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <span key={v.id} className="border rounded px-3 py-1 text-sm">
                    {v.name} — {formatVND(v.price)} (còn {v.stockQuantity})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tồn kho */}
          <div className={`text-sm font-medium ${product.stockQuantity <= 5 ? 'text-red-600' : 'text-green-600'}`}>
            {product.stockQuantity > 0
              ? `Còn ${product.stockQuantity} ${product.unit}`
              : 'Hết hàng'}
          </div>

          <AddToCartButton productId={product.id} disabled={product.stockQuantity <= 0} />

          {/* Thông tin sạp */}
          <div className="border-t pt-4">
            <a href={`/sap-hang/${product.shop.id}`} className="flex items-center gap-3 hover:underline">
              {product.shop.image && <img src={product.shop.image} alt={product.shop.name} className="w-12 h-12 rounded-full" />}
              <div>
                <div className="font-medium">{product.shop.name}</div>
                <div className="text-sm text-gray-500">⭐ {product.shop.rating.toFixed(1)} · {product.shop.reviewCount} đánh giá</div>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* Đánh giá */}
      <ReviewSection productId={product.id} reviews={product.reviews} />
    </div>
  )
}
```

---

## §9 TRANG KHO — `src/app/(seller)/seller/kho/page.tsx` (P1-1)

```tsx
// src/app/(seller)/seller/kho/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { formatVND } from '@/lib/money'

interface StockProduct {
  id: string
  name: string
  unit: string
  stockQuantity: number
  lowStockThreshold: number
  sku: string | null
  variants: { id: string; name: string; stockQuantity: number }[]
}

export default function InventoryPage() {
  const [products, setProducts] = useState<StockProduct[]>([])
  const [filter, setFilter] = useState<'all' | 'low'>('all')
  const [loading, setLoading] = useState(true)
  const [importModal, setImportModal] = useState<{ productId: string; name: string } | null>(null)
  const [importQty, setImportQty] = useState(0)

  useEffect(() => {
    fetch(`/api/seller/inventory${filter === 'low' ? '?filter=low-stock' : ''}`)
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []))
      .finally(() => setLoading(false))
  }, [filter])

  async function handleImport() {
    if (!importModal || importQty <= 0) return
    const res = await fetch('/api/seller/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: importModal.productId, quantity: importQty }),
    })
    if (res.ok) {
      setImportModal(null)
      setImportQty(0)
      // Reload
      setFilter('all'); setFilter('all')
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Quản lý kho</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded ${filter === 'all' ? 'bg-green-600 text-white' : 'border'}`}
          >Tất cả</button>
          <button
            onClick={() => setFilter('low')}
            className={`px-3 py-1 rounded ${filter === 'low' ? 'bg-red-600 text-white' : 'border'}`}
          >Sắp hết</button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Đang tải...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-8 text-gray-500">Không có sản phẩm</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr>
                <th className="text-left py-2">Sản phẩm</th>
                <th className="text-right">Tồn kho</th>
                <th className="text-right">Ngưỡng cảnh báo</th>
                <th className="text-right">Trạng thái</th>
                <th className="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="py-2">
                    <div className="font-medium">{p.name}</div>
                    {p.sku && <div className="text-xs text-gray-400">SKU: {p.sku}</div>}
                    {p.variants.map((v) => (
                      <div key={v.id} className="text-xs text-gray-500">{v.name}: {v.stockQuantity}</div>
                    ))}
                  </td>
                  <td className="text-right font-medium">{p.stockQuantity} {p.unit}</td>
                  <td className="text-right text-gray-500">{p.lowStockThreshold}</td>
                  <td className="text-right">
                    {p.stockQuantity <= 0 ? (
                      <span className="text-red-600 font-medium">Hết hàng</span>
                    ) : p.stockQuantity <= p.lowStockThreshold ? (
                      <span className="text-orange-600 font-medium">Sắp hết</span>
                    ) : (
                      <span className="text-green-600">Đủ hàng</span>
                    )}
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() => { setImportModal({ productId: p.id, name: p.name }); setImportQty(0) }}
                      className="text-green-600 hover:underline text-sm"
                    >+ Nhập kho</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal nhập kho */}
      {importModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h2 className="text-lg font-bold mb-2">Nhập kho: {importModal.name}</h2>
            <input
              type="number" min={1} value={importQty || ''}
              onChange={(e) => setImportQty(parseInt(e.target.value, 10) || 0)}
              className="w-full border rounded px-3 py-2 mb-4"
              placeholder="Số lượng nhập"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setImportModal(null)} className="px-4 py-2 border rounded">Huỷ</button>
              <button onClick={handleImport} disabled={importQty <= 0} className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50">Xác nhận</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## §10 NEXT.CONFIG — CSP HEADERS (P1-5)

```typescript
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // ...config hiện tại...
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: cspHeader },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ]
  },
}

// CSP: cho phép self + CDN ảnh + cổng thanh toán
const cspHeader = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // Next.js cần unsafe-inline/eval
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https: blob:",                 // cho phép ảnh từ mọi https CDN
  "font-src 'self' data:",
  "connect-src 'self' https://sandbox.vnpayment.vn https://api.momo.vn wss://*.pusher.com wss://*.ably.com",
  "frame-src https://sandbox.vnpayment.vn",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://sandbox.vnpayment.vn",
].join('; ')

export default nextConfig
```

---

## §11 PACKAGE.JSON — DEPS CẦN THÊM

```bash
# Cài thêm:
pnpm add jose bcryptjs zod @upstash/ratelimit @upstash/redis pusher pusher-js
pnpm add -D @types/bcryptjs

# Test:
pnpm add -D vitest @playwright/test

# Rich text editor (cho mô tả dài):
pnpm add @tiptap/react @tiptap/starter-kit @tiptap/extension-image

# Table UI (seller):
pnpm add @tanstack/react-table

# Form:
pnpm add react-hook-form @hookform/resolvers
```

### `.env.example`

```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/zmarket?schema=public"

# Auth
JWT_SECRET="your-super-secret-key-min-32-chars"

# Google OAuth
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# VNPay Sandbox
VNP_TMN_CODE="..."
VNP_HASH_SECRET="..."
VNP_URL="https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
VNP_RETURN_URL="https://zmarketvn-main.vercel.app/api/payment/return"
VNP_IPN_URL="https://zmarketvn-main.vercel.app/api/payment/webhook/vnpay"

# Pusher (Realtime thay Socket.IO)
PUSHER_APP_ID="..."
PUSHER_KEY="..."
PUSHER_SECRET="..."
PUSHER_CLUSTER="ap1"
NEXT_PUBLIC_PUSHER_KEY="..."
NEXT_PUBLIC_PUSHER_CLUSTER="ap1"

# Upstash Redis (Rate limit)
UPSTASH_REDIS_REST_URL="..."
UPSTASH_REDIS_REST_TOKEN="..."
```

---

## §12 SỬA COUNT-UP ÂM — LANDING (P1-4)

```tsx
// src/components/CountUp.tsx — sửa hook đếm
'use client'
import { useEffect, useState } from 'react'

export function CountUp({ end, suffix = '' }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const duration = 2000
    const steps = 60
    const increment = Math.max(0, end) / steps   // ★ kẹp Math.max(0, end)
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= Math.max(0, end)) {
        setCount(Math.max(0, end))               // ★ không bao giờ âm
        clearInterval(timer)
      } else {
        setCount(Math.floor(current))
      }
    }, duration / steps)
    return () => clearInterval(timer)
  }, [end])

  return <span>{count.toLocaleString('vi-VN')}{suffix}</span>
}

// Cách dùng:
// <CountUp end={842} suffix="+" /> → "842+"
// <CountUp end={0} suffix="ph" /> → "0ph" (không còn -842+)
```

---

## §13 GỠ SOCKET.IO + CHUYỂN PUSHER (P0-1)

```bash
# 1. Gỡ socket.io
pnpm remove socket.io socket.io-client

# 2. Cài pusher
pnpm add pusher pusher-js
```

```typescript
// src/components/ChatWindow.tsx — thay socket bằng Pusher
'use client'
import { useEffect, useState, useRef } from 'react'
import Pusher from 'pusher-js'

export function ChatWindow({ conversationId }: { conversationId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const channelRef = useRef<Pusher | null>(null)

  useEffect(() => {
    // Load tin nhắn ban đầu
    fetch(`/api/chat/messages?conversationId=${conversationId}`)
      .then((r) => r.json())
      .then((d) => setMessages(d.messages || []))

    // Subscribe Pusher channel
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap1',
    })
    channelRef.current = pusher
    const channel = pusher.subscribe(`chat-${conversationId}`)
    channel.bind('new-message', (msg: Message) => {
      setMessages((prev) => [...prev, msg])
    })

    return () => { pusher.unsubscribe(`chat-${conversationId}`); pusher.disconnect() }
  }, [conversationId])

  async function sendMessage(content: string) {
    const res = await fetch('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, content }),
    })
    // Server sẽ push qua Pusher → cả 2 bên nhận
    if (!res.ok) console.error('send failed')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((m) => (
          <div key={m.id} className={`p-2 rounded max-w-[70%] ${m.isMe ? 'bg-green-100 ml-auto' : 'bg-gray-100'}`}>
            {m.content}
          </div>
        ))}
      </div>
      <ChatInput onSend={sendMessage} />
    </div>
  )
}
```

---

## §14 SEED SCRIPT — `prisma/seed.ts`

```typescript
// prisma/seed.ts
import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding...')

  // ── Users ──
  const password = await bcrypt.hash('123456', 10)
  const adminPw = await bcrypt.hash('admin@123', 10)

  const buyer = await prisma.user.upsert({
    where: { email: 'nguoimua@zmarket.vn' },
    update: {},
    create: { email: 'nguoimua@zmarket.vn', password, name: 'Nguyễn Văn Mua', phone: '0901234567', role: Role.BUYER, address: '123 Nguyễn Huệ, Quận 1, TP.HCM' },
  })
  const seller = await prisma.user.upsert({
    where: { email: 'tieuthuong@zmarket.vn' },
    update: {},
    create: { email: 'tieuthuong@zmarket.vn', password, name: 'Trần Thị Bưởi', phone: '0912345678', role: Role.SELLER, address: '456 Lê Lợi, Quận 1, TP.HCM' },
  })
  const shipper = await prisma.user.upsert({
    where: { email: 'shipper@zmarket.vn' },
    update: {},
    create: { email: 'shipper@zmarket.vn', password, name: 'Phạm Văn Giao', phone: '0923456789', role: Role.SHIPPER, address: '789 Trần Hưng Đạo, Quận 5, TP.HCM' },
  })
  const admin = await prisma.user.upsert({
    where: { email: 'admin@123' },
    update: {},
    create: { email: 'admin@123', password: adminPw, name: 'Admin ZMarket', phone: '0987654321', role: Role.ADMIN },
  })

  // ── Shop ──
  const shop = await prisma.shop.upsert({
    where: { ownerId: seller.id },
    update: {},
    create: {
      name: 'Vườn Nhà Bưởi',
      description: 'Rau củ quả tươi sạch từ vườn nhà, không hóa chất. Giao hàng nhanh chóng trong 2h!',
      image: 'https://sfile.chatglm.cn/images-ppt/cddf15cb43ef.jpeg',
      address: '456 Lê Lợi, Quận 1, TP.HCM',
      phone: '0912345678',
      ownerId: seller.id,
    },
  })

  // ── Categories ──
  const rauCu = await prisma.category.upsert({ where: { slug: 'rau-cu' }, update: {}, create: { name: 'Rau củ', icon: '🥬', slug: 'rau-cu' } })
  const traiCay = await prisma.category.upsert({ where: { slug: 'trai-cay' }, update: {}, create: { name: 'Trái cây', icon: '🍎', slug: 'trai-cay' } })
  const thitCa = await prisma.category.upsert({ where: { slug: 'thit-ca' }, update: {}, create: { name: 'Thịt cá', icon: '🍖', slug: 'thit-ca' } })
  const giaVi = await prisma.category.upsert({ where: { slug: 'gia-vi' }, update: {}, create: { name: 'Gia vị', icon: '🌶️', slug: 'gia-vi' } })

  // ── Products (có stockQuantity) ──
  const products = [
    { name: 'Rau muống', price: 15000, unit: 'bó', stockQuantity: 50, categoryId: rauCu.id, images: ['https://sfile.chatglm.cn/images-ppt/rau-muong.jpg'] },
    { name: 'Cà chua', price: 25000, unit: 'kg', stockQuantity: 30, categoryId: rauCu.id, images: ['https://sfile.chatglm.cn/images-ppt/ca-chua.jpg'] },
    { name: 'Xoài cát Hòa Lộc', price: 65000, originalPrice: 80000, unit: 'kg', stockQuantity: 20, categoryId: traiCay.id, images: ['https://sfile.chatglm.cn/images-ppt/xoai.jpg'] },
    { name: 'Sầu riêng Ri6', price: 120000, unit: 'kg', stockQuantity: 15, categoryId: traiCay.id, images: ['https://sfile.chatglm.cn/images-ppt/sau-rieng.jpg'] },
  ]

  for (const p of products) {
    const product = await prisma.product.create({
      data: { ...p, shopId: shop.id, isActive: true, weightGram: 1000 },
    })
    // Ghi StockMovement IMPORT ban đầu
    await prisma.stockMovement.create({
      data: { productId: product.id, delta: p.stockQuantity, reason: 'IMPORT', userId: seller.id, note: 'Nhập kho ban đầu' },
    })
  }

  console.log('Seed done!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
```

Thêm vào `package.json`:
```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

---

## §15 DANH SÁCH TASK CHI TIẾT CHO GEMINI

> Mỗi task có prompt sẵn dán vào Antigravity. Gemini đọc file này + audit file, dán code, chạy build, báo cáo.

### Task P0-1: Gỡ Socket.IO + dựng Pusher realtime

```
@workspace Thực hiện Task P0-1: Thay Socket.IO bằng Pusher Channels.

BỐI CẢNH: Z-Market chạy trên Vercel serverless. Socket.IO báo lỗi WebSocket 308.
Vercel không hỗ trợ WebSocket bền → phải thay.

CÁC BƯỚC:
1. Chạy: pnpm remove socket.io socket.io-client
2. Chạy: pnpm add pusher pusher-js
3. Tạo src/lib/realtime.ts (dán code từ §3.6 của ZMARKET_IMPLEMENTATION_GUIDE.md)
4. Tạo src/lib/realtime-client.ts (Pusher client-side, xem comment trong §3.6)
5. Sửa src/components/ChatWindow.tsx (dán code từ §13)
6. Sửa mọi nơi import socket.io-client → chuyển sang pusher-js
7. Thêm env vào .env.example: PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER, NEXT_PUBLIC_PUSHER_KEY, NEXT_PUBLIC_PUSHER_CLUSTER
8. Cập nhật next.config.ts CSP: thêm wss://*.pusher.com vào connect-src (xem §10)

ACCEPTANCE:
- pnpm build pass, không còn import socket.io
- Console trình duyệt không còn lỗi WebSocket 308
- (Nếu chưa có Pusher key) code fallback gracefully: log warning, tin nhắn vẫn lưu DB
```

### Task P0-2: Chuyển sang App Router thật + middleware

```
@workspace Thực hiện Task P0-2: Chuyển Z-Market sang App Router có route thật.

BỐI CẢNH: Hiện toàn bộ app chạy trên URL / duy nhất. Đăng nhập, chi tiết sản phẩm,
giỏ hàng... đều là modal/state. Mất deep-link, SEO = 0, nút Back vô dụng.

CÁC BƯỚC:
1. Tạo src/middleware.ts (dán code từ §4 của ZMARKET_IMPLEMENTATION_GUIDE.md)
2. Tạo cây route (xem §2):
   - (public)/san-pham/page.tsx — danh sách + filter qua searchParams
   - (public)/san-pham/[id]/page.tsx — chi tiết SSR (dán code từ §8)
   - (auth)/dang-nhap/page.tsx — trang login riêng (không phải modal)
   - (buyer)/gio-hang/page.tsx
   - (buyer)/thanh-toan/page.tsx (dán code từ §7)
   - (buyer)/don-hang/page.tsx + [id]/page.tsx
   - (seller)/seller/page.tsx + san-pham/ + don-hang/ + kho/
   - (shipper)/shipper/...
   - (admin)/admin/...
3. Migrate logic từ component state sang page component. Lọc/tìm kiếm lưu vào URL searchParams.
4. Trang chi tiết sản phẩm dùng generateMetadata() cho SEO (xem §8).
5. Middleware bảo vệ: buyer không vào /admin, seller không vào /shipper...

ACCEPTANCE:
- URL thay đổi theo màn: /san-pham, /gio-hang, /seller/kho...
- Mở thẳng /san-pham/<id> ra đúng sản phẩm + meta OG
- Buyer vào /admin → redirect về /
- pnpm build pass
```

### Task P0-3: Tích hợp thanh toán COD + VNPay

```
@workspace Thực hiện Task P0-3: Thêm thanh toán COD + VNPay sandbox.

BỐI CẢNH: Z-Market chưa có endpoint thanh toán. Landing khoe logo VNPay nhưng không tích hợp.

CÁC BƯỚC:
1. Đảm bảo schema.prisma đã có model Payment (xem §1). Chạy npx prisma migrate dev.
2. Tạo src/lib/vnpay.ts (dán code từ §3.4)
3. Tạo src/modules/payment/service.ts (dán code từ §5.5)
4. Tạo API routes:
   - src/app/api/payment/create/route.ts (dán code từ §6.3)
   - src/app/api/payment/webhook/vnpay/route.ts (dán code từ §6.4)
5. Sửa src/app/api/orders/route.ts: POST tạo đơn + trả paymentUrl nếu VNPAY (dán code từ §6.1)
6. Tạo trang (buyer)/thanh-toan/page.tsx (dán code từ §7)
7. Thêm env vào .env.example (xem §11): VNP_TMN_CODE, VNP_HASH_SECRET, VNP_URL, VNP_RETURN_URL, VNP_IPN_URL
8. Cập nhật CSP next.config.ts: thêm https://sandbox.vnpayment.vn vào connect-src + frame-src + form-action

ACCEPTANCE:
- Đặt đơn COD → Order.paymentStatus=PENDING, paymentMethod=COD
- Đặt đơn VNPay → redirect sang sandbox.vnpayment.vn
- Webhook gọi 2 lần → không cộng tiền 2 lần (idempotent, check payment.status==='PAID')
- pnpm build pass
```

### Task P0-4: Chuẩn hoá mô hình tiền + sửa doanh thu dashboard

```
@workspace Thực hiện Task P0-4: Sửa sai lệch số tiền.

BỐI CẢNH: Đơn #bzf67w81 dòng hàng = 55.000đ nhưng Tổng 70.000đ (phí ship ẩn +15k).
Đơn #k25z2ql3 dòng = 70.000đ nhưng Tổng 85.000đ. Dashboard doanh thu 55.000đ
không khớp tổng 2 đơn 155.000đ.

CÁC BƯỚC:
1. Đảm bảo schema.prisma Order có: subtotal, shippingFee, discount, total (Int VND). Migrate.
2. Tạo src/lib/money.ts (dán code từ §3.3)
3. Sửa src/modules/order/service.ts: createOrder tính tiền SERVER (dán code từ §5.1)
   - subtotal = sum(price * qty)
   - shippingFee = calculateShippingFeeByWeight()
   - total = subtotal + shippingFee - discount
4. Sửa trang đơn hàng + dashboard seller: hiển thị TÁCH DÒNG "Phí giao hàng"
5. Sửa dashboard: doanh thu = SUM(total) WHERE status IN ('DELIVERED','PAID') — không phải subtotal
6. Mọi hiển thị tiền dùng formatVND() từ src/lib/money.ts

ACCEPTANCE:
- Tạo đơn 2 sp (30k + 25k) → subtotal=55k, shippingFee=15k, total=70k, hiển thị đủ 3 dòng
- Dashboard doanh thu = tổng các đơn DELIVERED/PAID
- pnpm build pass
```

### Task P1-1: Quản lý kho cho tiểu thương

```
@workspace Thực hiện Task P1-1: Thêm quản lý kho hàng đầy đủ cho seller.

BỐI CẢNH: Cột "Tồn kho" chỉ hiện "Còn hàng" (boolean), không có số lượng.
Form đăng bán thiếu trường số lượng/đơn vị.

CÁC BƯỚC:
1. Đảm bảo schema.prisma có: Product.stockQuantity, unit, lowStockThreshold, sku, weightGram;
   model StockMovement; model ProductVariant. Migrate.
2. Tạo src/modules/inventory/service.ts (dán code từ §5.3)
3. Tạo src/modules/inventory/schema.ts (dán code từ §5.4)
4. Tạo API: src/app/api/seller/inventory/route.ts (dán code từ §6.5)
5. Tạo trang: src/app/(seller)/seller/kho/page.tsx (dán code từ §9)
6. Sửa createOrder trong order/service.ts: trừ kho + ghi StockMovement trong $transaction (xem §5.1)
7. Sửa cancelOrder: cộng lại kho (xem §5.1)
8. Sửa form đăng bán: thêm trường stockQuantity, unit, sku, weightGram, lowStockThreshold
9. Sửa bảng sản phẩm seller: cột "Tồn kho" hiển thị SỐ + badge màu (xanh/đỏ)

ACCEPTANCE:
- Tạo SP stockQuantity=10, unit='kg' → đặt 3kg → kho còn 7 + có StockMovement(-3)
- Đặt 100kg → bị chặn "không đủ hàng"
- Trang /seller/kho lọc được hàng sắp hết
- Nhập kho +5 → kho thành 12 + có StockMovement(+5, IMPORT)
- pnpm build pass
```

### Task P1-2: Nâng cấp form đăng bán + trang chi tiết

```
@workspace Thực hiện Task P1-2: Form đăng bán + trang chi tiết sản phẩm đầy đủ.

CÁC BƯỚC:
1. Đảm bảo schema Product có: longDescription, originalPrice, unit, images[], weightGram, origin, storageInfo;
   model ProductVariant. Migrate.
2. Sửa src/modules/catalog/service.ts: createProduct + updateProduct (dán code từ §5.6)
3. Sửa form đăng bán (seller/san-pham/moi/page.tsx): thêm trường:
   - Nhiều ảnh (gallery, upload qua /api/upload)
   - Đơn vị (kg/bó/trái/hộp) — select
   - Giá gốc (originalPrice) + giá bán
   - SKU
   - Xuất xứ
   - Mô tả dài (rich text — cài @tiptap/react)
   - Bảo quản / hạn sử dụng
   - Trọng lượng (weightGram)
   - Biến thể (thêm/xoá động: name + price + stockQuantity)
   - Bật/tắt bán (isActive)
4. Tạo trang chi tiết (public)/san-pham/[id]/page.tsx (dán code từ §8):
   - Gallery ảnh + thumbnail
   - Chọn biến thể → đổi giá
   - Hiển thị đánh giá + sạp hàng
   - generateMetadata cho SEO

ACCEPTANCE:
- Seller đăng SP 4 ảnh, unit='bó', 2 biến thể (0.5kg/1kg)
- Trang chi tiết render gallery + chọn biến thể đổi giá
- Meta OG có ảnh + title
- pnpm build pass
```

### Task P1-3: Hệ thống đánh giá

```
@workspace Thực hiện Task P1-3: Hệ thống đánh giá verified-purchase.

CÁC BƯỚC:
1. Đảm bảo schema có model Review. Migrate.
2. Tạo src/modules/review/service.ts (dán code từ §5.7)
3. Tạo API: src/app/api/review/route.ts (dán code từ §6.6)
4. Tạo component ReviewSection: hiển thị đánh giá + phân bố sao + form viết review
5. Chỉ cho review khi đơn DELIVERED + có sản phẩm đó trong đơn
6. Tạo review → cập nhật Product.rating + Shop.rating (aggregate)

ACCEPTANCE:
- Buyer có đơn DELIVERED → viết review 5★ → rating SP cập nhật
- Buyer chưa mua → bị chặn 403
- Đã review rồi → bị chặn 400
- pnpm build pass
```

### Task P1-4: Sửa count-up âm

```
@workspace Thực hiện Task P1-4: Sửa số đếm âm ở landing page.

CÁC BƯỚC:
1. Tạo src/components/CountUp.tsx (dán code từ §12)
2. Tìm component đếm hiện tại ở landing (public/page.tsx)
3. Thay bằng <CountUp end={value} suffix="+" />
4. Đảm bảo Math.max(0, end) ở mọi bước

ACCEPTANCE:
- Số luôn ≥ 0 từ mount đến giá trị cuối
- Không còn "-842+" hay "-21036+"
- pnpm build pass
```

### Task P1-5 + P1-6: CSP + validation + rate-limit

```
@workspace Thực hiện Task P1-5+P1-6: Security headers + validation + rate limit.

CÁC BƯỚC:
1. Sửa next.config.ts: thêm CSP + headers (dán code từ §10)
2. Tạo src/lib/rate-limit.ts (dán code từ §3.5)
3. Cài: pnpm add @upstash/ratelimit @upstash/redis zod
4. Sửa src/app/api/auth/login/route.ts: thêm rate-limit (dán code từ §6.7)
5. Sửa src/app/api/auth/register/route.ts: thêm rate-limit + zod validation
6. Rà soát TẤT CẢ API route: thêm zod validation cho body/query/params
7. Chuẩn hoá error response: { error: string, code: number, fields?: object }

ACCEPTANCE:
- Header response có Content-Security-Policy
- Login sai 10 lần/phút → 429
- Gửi body sai schema → 400 + danh sách field lỗi
- pnpm build pass
```

### Task P2-1: Modular Monolith

```
@workspace Thực hiện Task P2-1: Tái cấu trúc thành Modular Monolith.

CÁC BƯỚC:
1. Tạo src/modules/ theo §2: auth, catalog, cart, order, inventory, payment, delivery, review, chat, admin
2. Mỗi module: service.ts (logic), schema.ts (zod), types.ts
3. Di chuyển logic từ API route vào service
4. API route chỉ: parse → validate → gọi service → trả response
5. Không còn truy vấn Prisma trực tiếp trong component

ACCEPTANCE:
- src/modules/ có 10 module, mỗi cái có service.ts
- API route không còn logic nghiệp vụ, chỉ orchestrate
- pnpm build pass
```

### Task P2-2: Test E2E + CI

```
@workspace Thực hiện Task P2-2: Thêm test E2E + CI.

CÁC BƯỚC:
1. Cài: pnpm add -D vitest @playwright/test
2. Tạo playwright.config.ts
3. Tạo tests/e2e/auth.spec.ts: login 4 role, kiểm tra redirect
4. Tạo tests/e2e/checkout.spec.ts: add to cart → checkout COD → order created
5. Tạo tests/e2e/inventory.spec.ts: import stock → stock increases
6. Tạo tests/unit/money.test.ts: calculateOrderTotal, formatVND
7. Tạo .github/workflows/ci.yml: build + lint + test on push/PR

ACCEPTANCE:
- pnpm test pass
- CI chạy xanh trên GitHub Actions
```

---

## §16 CHECKLIST NHẬN DIỆN BUG ĐÃ SỬA (để bạn verify)

Sau khi Gemini làm xong, kiểm tra:

- [ ] Console trình duyệt không còn `WebSocket 308`
- [ ] URL thay đổi khi click nav (không kẹt ở `/`)
- [ ] Mở `/san-pham/<id>` trực tiếp → ra trang sản phẩm + meta OG
- [ ] Buyer vào `/admin` → bị redirect
- [ ] Đặt đơn COD → có đơn + paymentStatus=PENDING
- [ ] Đặt đơn VNPay → redirect sandbox.vnpayment.vn
- [ ] Webhook idempotent (gọi 2 lần không double)
- [ ] Đơn hàng hiển thị 3 dòng: tiền hàng / phí ship / tổng
- [ ] Dashboard doanh thu = tổng đơn DELIVERED
- [ ] Seller bảng SP: cột tồn kho hiện SỐ (không phải "Còn hàng")
- [ ] Đặt quá số lượng → bị chặn
- [ ] Trang /seller/kho lọc được hàng sắp hết
- [ ] Nhập kho → số tăng + có lịch sử
- [ ] Form đăng bán có: nhiều ảnh, đơn vị, biến thể, mô tả dài
- [ ] Trang chi tiết có gallery + chọn biến thể
- [ ] Review chỉ cho đơn DELIVERED
- [ ] Landing số đếm không âm
- [ ] Header có Content-Security-Policy
- [ ] Login sai 10 lần → 429
- [ ] `pnpm build` xanh

— Hết —