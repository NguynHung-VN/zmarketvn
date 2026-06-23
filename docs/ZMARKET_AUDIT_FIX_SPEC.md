# Z-MARKET — Đánh giá khắt khe & Đặc tả sửa lỗi cho Antigravity (Gemini Pro / Flash)

> **Cách dùng tài liệu này trong Antigravity:** Mở repo `zmarketvn-main` trong Antigravity → tạo file `AGENTS.md` ở gốc repo và dán nội dung mục **"§0 Quy ước cho Agent"** vào đó → sau đó giao từng Task ở **§7** cho Gemini theo thứ tự P0 → P1 → P2. Mỗi Task có *file cần đụng tới*, *cách làm*, *tool/framework*, và *tiêu chí nghiệm thu (Acceptance Criteria)* để agent tự kiểm chứng.

Ngày đánh giá: 2026-06-21 · URL: https://zmarketvn-main.vercel.app/

---

## §0 Quy ước cho Agent (dán vào AGENTS.md)

```
Bạn là kỹ sư senior fullstack làm việc trên Z-Market (Next.js App Router + Prisma + DB).
NGUYÊN TẮC:
1. KHÔNG đập đi xây lại. Refactor tăng dần, mỗi PR nhỏ, build phải xanh.
2. Sau mỗi thay đổi: chạy `pnpm build` (hoặc npm), `pnpm lint`, và test (nếu có) — phải pass.
3. TypeScript strict. Không dùng `any` trừ khi bắt buộc và phải // TODO.
4. Mọi API route phải: (a) xác thực, (b) kiểm tra role, (c) validate input bằng zod, (d) trả lỗi chuẩn { error, code }.
5. Mọi truy vấn tiền/tồn kho phải chạy trong Prisma $transaction để tránh race condition.
6. Tiền tệ: lưu số nguyên VND (đồng), không dùng float.
7. Không commit secret. Dùng biến môi trường + .env.example.
8. Sau khi sửa, cập nhật mục CHANGELOG ở cuối AGENTS.md.
```

---

## §1 Stack đã phát hiện (để agent định hướng)

| Lớp | Công nghệ |
|---|---|
| Framework | **Next.js (App Router, Turbopack)**, React, TypeScript |
| UI | Tailwind CSS, styled-jsx, framer-motion (hiệu ứng fade) |
| Backend | **Next.js API Routes** (`/app/api/**`) — fullstack monolith |
| ORM/DB | **Prisma** (ID dạng `cuid`) → PostgreSQL (suy đoán) |
| Auth | Cookie httpOnly (JWT), có **Google OAuth** (`/api/auth/google`) |
| Realtime | **Socket.IO** (`/socket.io/`) — **đang hỏng trên Vercel** |
| Hosting | Vercel (serverless) |
| Asset gốc | ảnh/logo từ `z-cdn.chatglm.cn`, `sfile.chatglm.cn` (sinh bởi Z.ai) |

API hiện có: `auth/{login,register,logout,me,google}`, `cart`, `categories`, `orders`, `seller/{products,orders}`, `shipper/deliveries`, `shops`, `wishlist`, `chat/{conversations,messages,upload}`, `feedback`, `upload`, `admin/stats`.

Vai trò: `BUYER`, `SELLER` (tiểu thương), `SHIPPER`, `ADMIN`.

---

## §2 Lỗi NGHIÊM TRỌNG (P0 — sửa trước tiên)

### P0-1. Realtime/Chat hỏng hoàn toàn trên Vercel
- **Bằng chứng:** Console mọi vai trò báo `WebSocket connection to 'wss://.../socket.io/...' failed: handshake Unexpected response code: 308`.
- **Nguyên nhân:** Vercel serverless **không hỗ trợ WebSocket/Socket.IO bền vững**. Server Socket.IO không thể sống trong serverless function.
- **Hậu quả:** Tính năng "Nhắn tin" giữa buyer↔seller↔shipper không nhận tin nhắn thời gian thực; có thể treo, retry vô hạn, tốn pin/CPU.
- **Cách sửa (chọn 1):**
  - **Khuyến nghị (nhanh, ít hạ tầng):** thay Socket.IO bằng **Pusher Channels** hoặc **Ably** (managed websocket, có free tier). Hoặc **Supabase Realtime** nếu DB chuyển sang Supabase.
  - **Hoặc** tách 1 **microservice chat** chạy Socket.IO trên nền có WS bền (Railway/Render/Fly.io) — xem §4.
  - **Tối thiểu (tạm):** nếu chưa kịp realtime, fallback **polling** `setInterval` gọi `/api/chat/messages?since=...` mỗi 3–5s + optimistic UI, và GỠ socket.io để hết lỗi console.
- **Framework/tool:** `pusher` + `pusher-js`, hoặc `ably`, hoặc `@supabase/realtime-js`.
- **Acceptance:** mở 2 trình duyệt (buyer & seller) gửi tin → tin xuất hiện ≤2s; console không còn lỗi WebSocket 308.

### P0-2. Toàn bộ ứng dụng chạy trên 1 URL `/` — không có routing
- **Bằng chứng:** Đăng nhập, danh sách sản phẩm, **chi tiết sản phẩm**, giỏ hàng, đơn hàng, dashboard seller/admin/shipper… tất cả đều giữ nguyên URL `https://.../`. Chi tiết sản phẩm và đăng nhập là **modal**, không phải trang.
- **Hậu quả:** Không deep-link/chia sẻ link sản phẩm, nút Back trình duyệt vô dụng, **SEO sản phẩm = 0**, không đo được funnel theo trang, refresh mất ngữ cảnh.
- **Cách sửa:** Chuyển sang **App Router thật** với cây route:
  ```
  app/
    (public)/page.tsx              # landing
    (public)/san-pham/page.tsx     # danh sách + filter qua searchParams
    (public)/san-pham/[id]/page.tsx# CHI TIẾT là route riêng (SSR/ISR cho SEO)
    (public)/sap-hang/[id]/page.tsx
    (auth)/dang-nhap/page.tsx
    (buyer)/gio-hang/page.tsx
    (buyer)/don-hang/page.tsx
    (buyer)/thanh-toan/page.tsx
    (seller)/seller/...            # dashboard, products, orders, kho
    (shipper)/shipper/...
    (admin)/admin/...
    chat/page.tsx
  ```
  - Lọc/tìm kiếm lưu vào **URL `searchParams`** (vd `?category=rau-cu&q=ca-chua&page=2`) thay vì state nội bộ.
  - Bảo vệ route theo role bằng `middleware.ts` (đọc cookie JWT → redirect nếu sai role).
  - Trang chi tiết dùng `generateMetadata()` + ảnh OG để SEO.
- **Tool/framework:** Next App Router, `next/navigation` (`useRouter`, `useSearchParams`), `middleware.ts`, `next-seo` hoặc Metadata API.
- **Acceptance:** URL thay đổi theo từng màn; mở thẳng `/san-pham/<id>` ra đúng sản phẩm với meta OG; middleware chặn buyer vào `/admin`.

### P0-3. CHƯA CÓ THANH TOÁN (xác nhận: không có endpoint payment)
- **Bằng chứng:** Không tồn tại `/api/payment*`, không có webhook; landing có khoe logo "VNPay" nhưng không có tích hợp.
- **Cách sửa (theo thị trường VN):**
  - **COD** (thanh toán khi nhận hàng) — bắt buộc, dễ nhất, để mặc định.
  - **VNPay** và/hoặc **MoMo** (ví phổ biến VN). Quốc tế: **Stripe** (test mode).
  - Kiến trúc: tạo bảng `Payment`, route `POST /api/payment/create` (tạo URL thanh toán), **webhook** `POST /api/payment/webhook/vnpay` (xác minh chữ ký HMAC SHA512 của VNPay, cập nhật `Order.paymentStatus`). Đối soát idempotent (chống double-credit).
  - Trang `/thanh-toan`: chọn địa chỉ → chọn phương thức (COD/VNPay/MoMo) → tạo order `PENDING` → redirect cổng → webhook xác nhận → `PAID`.
- **Tool/framework:** SDK/HMAC VNPay (chuẩn `vnp_SecureHash` SHA512), MoMo AIO v2, hoặc `stripe` + `@stripe/stripe-js`. Verify webhook bằng `crypto` Node. Dùng **zod** validate callback.
- **Acceptance:** Đặt 1 đơn COD → `Order.status=PENDING, paymentMethod=COD`. Đặt 1 đơn VNPay sandbox → sau callback `paymentStatus=PAID`; webhook gọi lại 2 lần không cộng tiền 2 lần (idempotent).

### P0-4. Sai lệch số tiền & tồn kho (lỗi dữ liệu/tính toán)
- **Bằng chứng (seller `tieuthuong@zmarket.vn`):**
  - Đơn `#bzf67w81`: dòng hàng = Rau muống x2 (30.000đ) + Xoài x1 (25.000đ) = **55.000đ**, nhưng **Tổng hiển thị 70.000đ**.
  - Đơn `#k25z2ql3`: dòng hàng cộng = **70.000đ**, nhưng **Tổng 85.000đ**. (Lệch đều +15.000đ → nghi là **phí ship ẩn**, không itemize.)
  - Dashboard "Doanh thu = 55.000đ" trong khi 2 đơn tổng 155.000đ → công thức doanh thu không nhất quán.
- **Cách sửa:** Chuẩn hoá mô hình tiền: `Order.subtotal + shippingFee + discount = total`, hiển thị **tách dòng "Phí giao hàng"**. Doanh thu seller = SUM của các đơn theo trạng thái rõ ràng (vd chỉ `DELIVERED`/`PAID`), ghi rõ trong code. Tính tiền **ở server**, không tin client.
- **Acceptance:** Mọi nơi (đơn buyer, đơn seller, dashboard) hiển thị cùng một con số cho cùng một đơn; có dòng phí ship; tổng = subtotal + ship − giảm giá.

---

## §3 Lỗi & thiếu sót QUAN TRỌNG (P1)

### P1-1. Quản lý KHO HÀNG cho tiểu thương (yêu cầu chính của bạn)
- **Bằng chứng:** Bảng sản phẩm seller có cột "Tồn kho" nhưng chỉ hiện chữ **"Còn hàng"** (boolean), **không có số lượng**. Form thêm sản phẩm thiếu trường số lượng/đơn vị.
- **Cách sửa — nâng cấp model Product + nghiệp vụ kho:**
  - Thêm vào `schema.prisma`:
    ```prisma
    model Product {
      // ...hiện có...
      unit          String   @default("cái")   // kg, bó, trái, hộp...
      stockQuantity Int      @default(0)
      lowStockThreshold Int  @default(5)
      sku           String?  @unique
      images        String[]                    // nhiều ảnh
      isActive      Boolean  @default(true)
      weightGram    Int?                         // phục vụ tính phí ship
    }
    model StockMovement {                        // nhật ký xuất/nhập kho
      id        String   @id @default(cuid())
      productId String
      delta     Int                              // +nhập, -bán/-huỷ
      reason    String                           // 'IMPORT','SALE','ADJUST','RETURN'
      orderId   String?
      createdAt DateTime @default(now())
      product   Product  @relation(fields:[productId], references:[id])
    }
    model ProductVariant {                       // tuỳ chọn: phân loại (0.5kg/1kg)
      id String @id @default(cuid())
      productId String
      name String        // "1kg", "Loại 1"
      price Int
      stockQuantity Int @default(0)
      product Product @relation(fields:[productId], references:[id])
    }
    ```
  - Nghiệp vụ: khi đặt hàng → trong `$transaction` **trừ kho + ghi StockMovement(reason='SALE')**; nếu kho < số lượng → chặn đặt. Khi huỷ/hoàn → cộng lại. Cảnh báo khi `stockQuantity <= lowStockThreshold`.
  - Trang seller mới: **`/seller/kho`** — bảng tồn kho, nút **Nhập kho** (tăng số lượng + ghi log), bộ lọc "sắp hết hàng", lịch sử StockMovement.
  - Cột "Tồn kho" hiển thị **số thực + badge màu** (xanh/đỏ khi thấp).
- **Tool/framework:** Prisma migrate, zod, Prisma `$transaction`. UI bảng: TanStack Table; form: **react-hook-form + zod**.
- **Acceptance:** Tạo sản phẩm có `stockQuantity=10, unit='kg'`; đặt 3kg → kho còn 7 và có 1 StockMovement(-3); đặt 100kg → bị chặn "không đủ hàng"; trang `/seller/kho` lọc được hàng sắp hết.

### P1-2. Trang/Modal CHI TIẾT SẢN PHẨM cho tiểu thương đăng bán còn nghèo
- **Bằng chứng:** Chi tiết sản phẩm là modal; form đăng bán chỉ có: tên, mô tả, giá, 1 số, ảnh (url + file), chọn danh mục, 1 checkbox. Thiếu nhiều thứ một sàn TMĐT cần.
- **Bổ sung trường khi đăng bán & hiển thị chi tiết:**
  - **Nhiều ảnh** (gallery) + ảnh bìa; **đơn vị bán** (kg/bó/trái); **giá gốc + giá KM**; **SKU**; **xuất xứ**; **mô tả dài (rich text/markdown)**; **hạn sử dụng/bảo quản** (đặc thù thực phẩm tươi); **trọng lượng** (tính ship); **biến thể/phân loại**; **trạng thái bật/tắt bán**.
  - Trang chi tiết: gallery ảnh, chọn số lượng theo đơn vị, **đánh giá & hỏi đáp**, "sản phẩm cùng sạp", thông tin sạp + nút "Nhắn tin với sạp".
- **Tool/framework:** Upload nhiều ảnh: dùng `/api/upload` hiện có + lưu mảng URL; rich text: **Tiptap** hoặc markdown; form: react-hook-form + zod.
- **Acceptance:** Seller đăng 1 sản phẩm 4 ảnh, đơn vị "bó", có biến thể; trang chi tiết render gallery + chọn biến thể đổi giá.

### P1-3. Hệ thống đánh giá (rating) gần như trống / không hoạt động
- **Bằng chứng:** Đa số sản phẩm rating **0.0**; chỉ vài cái có 4.0/5.0. Không thấy luồng để buyer viết đánh giá sau khi nhận hàng.
- **Cách sửa:** Model `Review { productId, orderId, userId, rating 1..5, comment, images[], createdAt }`; chỉ cho đánh giá khi đơn `DELIVERED` (verified purchase); tính lại `Product.rating` (trung bình) qua trigger/aggregate; hiển thị phân bố sao + lọc theo sao.
- **Acceptance:** Buyer có đơn DELIVERED viết review 5★ → rating sản phẩm cập nhật; không cho review nếu chưa mua.

### P1-4. Số liệu landing hiển thị ÂM (lỗi animation đếm)
- **Bằng chứng:** Trang chủ hiện **"-842+ Sạp hàng"**, **"-21036+ Sản phẩm"** (số âm khi animate đếm lên).
- **Cách sửa:** Sửa hook đếm (count-up): kẹp `Math.max(0, value)`, bắt đầu từ 0, dùng `framer-motion` `useMotionValue`/`animate` hoặc `react-countup`. Đảm bảo không render giá trị trung gian âm.
- **Acceptance:** Số luôn ≥ 0 từ lúc mount đến giá trị cuối.

### P1-5. Thiếu Content-Security-Policy & headers nâng cao
- **Bằng chứng:** Có HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` (tốt) nhưng **không có `Content-Security-Policy`**.
- **Cách sửa:** Thêm CSP qua `next.config.js` headers hoặc `middleware.ts` (cho phép self + CDN ảnh `*.chatglm.cn`, cổng thanh toán). Thêm `Referrer-Policy`, `Permissions-Policy` (đã có permissions-policy). Cân nhắc nonce cho script.
- **Acceptance:** Header response có CSP hợp lý; trang vẫn load ảnh & cổng thanh toán.

### P1-6. Validation đầu vào & xử lý lỗi đồng nhất
- **Cách sửa:** Mọi `route.ts` validate bằng **zod** (body, query, params); chuẩn hoá lỗi `{ error, code, fields? }`; bắt lỗi Prisma (P2002 trùng unique...) → message thân thiện. Thêm rate-limit cho `auth/login`, `register`, `feedback` (chống brute-force/spam) bằng **@upstash/ratelimit** (Vercel-friendly).
- **Acceptance:** Gửi body sai schema → 400 với danh sách field lỗi; login sai 10 lần/phút → 429.

---

## §4 Tách MICROSERVICES — nên & không nên (đánh giá thẳng)

**Quan điểm khắt khe:** với quy mô hiện tại, **microservices toàn phần là quá sớm và sẽ làm chậm bạn**. Đúng hướng là **Modular Monolith trước**, rồi **chỉ tách ra service riêng những phần có runtime/scaling khác biệt rõ rệt**. Lý do tách Vercel-aware: serverless không hợp với kết nối bền (WS) và job nền dài.

**Bước 1 — Modular Monolith (làm ngay trong repo Next):** chia code theo *domain module*, ranh giới rõ, giao tiếp qua service layer (không gọi chéo Prisma lung tung):
```
src/modules/{auth, catalog, cart, order, inventory, payment, delivery, chat, review, admin}/
  service.ts  repo.ts  schema.ts (zod)  types.ts
app/api/** chỉ gọi vào modules/*/service.ts
```

**Bước 2 — Tách service riêng CHỈ khi cần (theo thứ tự ưu tiên):**
| Service | Vì sao tách | Hạ tầng gợi ý |
|---|---|---|
| **Realtime/Chat** | Cần WebSocket bền — Vercel không làm được | Node + Socket.IO trên **Railway/Render/Fly**, hoặc dùng managed **Pusher/Ably** (khỏi tách) |
| **Payment + Webhook** | Cần idempotency, retry, đối soát, bảo mật chữ ký | Có thể giữ trong Next route nhưng tách **module** rõ; nếu tải lớn → service riêng + hàng đợi |
| **Notification/Email/Push** | Việc nền, async | **Queue**: Upstash QStash / BullMQ + Redis; worker riêng |
| **Search** | Khi catalog lớn, cần full-text/tiếng Việt | **Meilisearch/Typesense** (service riêng), hoặc Postgres `tsvector` trước |
| **Media** | Ảnh sản phẩm | Object storage (S3/Cloudflare R2) + CDN, thay vì CDN chatglm |

**Giao tiếp giữa services:** REST nội bộ + **event-driven** cho việc async (vd `order.paid` → trừ kho, gửi noti, tạo delivery). Dùng webhook/queue, không gọi đồng bộ chuỗi dài. Hợp đồng API mô tả bằng **OpenAPI/zod**. Mỗi service có DB/schema riêng *chỉ khi* thực sự tách; giai đoạn đầu dùng chung Postgres theo schema namespace.

**Acceptance cho giai đoạn 1:** code đã gom theo `src/modules/*`; API routes mỏng, chỉ orchestrate; không còn truy vấn Prisma rải rác trong component.

---

## §5 Rà soát theo từng vai trò (checklist hoàn thiện "sàn TMĐT toàn diện")

**BUYER** (Sản phẩm, Sạp hàng, Yêu thích, Giỏ hàng, Đơn hàng, Nhắn tin, Phản hồi, Hồ sơ)
- [ ] Trang chi tiết là route riêng + gallery + biến thể + đánh giá (P0-2, P1-2, P1-3)
- [ ] Tìm kiếm/lọc lưu vào URL; thêm sắp xếp (giá, bán chạy, mới), lọc theo giá/sạp/đánh giá
- [ ] Giỏ hàng: cập nhật số lượng, chọn/bỏ chọn, hiển thị phí ship, mã giảm giá
- [ ] **Checkout + thanh toán** (P0-3): địa chỉ nhiều cái, COD/VNPay/MoMo
- [ ] Theo dõi đơn realtime + lịch sử trạng thái; huỷ đơn (điều kiện); mua lại
- [ ] Hồ sơ: đổi mật khẩu, sổ địa chỉ, quản lý ảnh đại diện

**SELLER / Tiểu thương** (Tổng quan, Sản phẩm, Đơn hàng, Sạp hàng, Nhắn tin, Phản hồi)
- [ ] **Quản lý kho** đầy đủ (P1-1) + cảnh báo sắp hết
- [ ] Form đăng bán đầy đủ trường + nhiều ảnh + biến thể + đơn vị (P1-2)
- [ ] Sửa/xoá/ẩn sản phẩm (kiểm tra nút "Thao tác" hiện đang trống chữ → đảm bảo Sửa/Xoá hoạt động)
- [ ] Đơn hàng: đổi trạng thái (Chuẩn bị → Sẵn sàng giao → Đang giao → Đã giao), in đơn, lọc theo trạng thái/ngày
- [ ] Dashboard: doanh thu chuẩn (P0-4), biểu đồ theo thời gian, top sản phẩm, sản phẩm sắp hết
- [ ] Quản lý hồ sơ sạp (ảnh bìa, mô tả, giờ mở cửa, địa chỉ)

**SHIPPER** (Đơn giao, Lịch sử, Nhắn tin, Phản hồi, Hồ sơ)
- [ ] Danh sách đơn khả dụng + nhận đơn (chống 2 shipper nhận 1 đơn → `$transaction` + optimistic lock)
- [ ] Cập nhật trạng thái giao + bằng chứng giao (ảnh), lý do giao thất bại
- [ ] Bản đồ/định tuyến (Google Maps/Mapbox) — tuỳ chọn nâng cao
- [ ] Thống kê thu nhập theo ngày

**ADMIN** (Tổng quan, Người dùng, Sạp hàng, Đơn hàng, Nhắn tin, Phản hồi)
- [ ] Duyệt/khoá sạp & người dùng (`isActive`), phân quyền
- [ ] Quản lý danh mục (CRUD)
- [ ] Xem & xử lý phản hồi/khiếu nại
- [ ] Báo cáo toàn sàn: GMV, đơn theo trạng thái, sạp top
- [ ] Nhật ký audit cho hành động admin

---

## §6 Chất lượng kỹ thuật chung (xuyên suốt)
- **Accessibility:** ảnh đã có `alt` (tốt). Bổ sung: focus trap cho modal, `aria-label` cho nút icon, đảm bảo phím tắt Esc đóng modal, contrast màu.
- **Performance:** dùng `next/image` cho ảnh (đang là `<img>` thường); lazy-load danh sách; ISR cho trang sản phẩm; bỏ animation chặn render.
- **Tiền tệ:** lưu **Int VND**; format hiển thị bằng `Intl.NumberFormat('vi-VN')`.
- **i18n/định dạng:** ngày giờ chuẩn `Asia/Ho_Chi_Minh`.
- **Testing:** **Vitest** (unit cho service tính tiền/kho), **Playwright** (E2E: login 4 role, đặt hàng, đổi trạng thái). Thêm CI GitHub Actions chạy build+lint+test.
- **Observability:** **Sentry** cho lỗi client/server; log có request id.
- **Env & docs:** thêm `.env.example`, README chạy local, `prisma migrate` scripts.

---

## §7 DANH SÁCH TASK CHO ANTIGRAVITY (giao tuần tự cho Gemini)

> Mỗi task: giao nguyên khối cho agent, yêu cầu agent tự chạy build/test và báo cáo theo Acceptance.

**P0 (chặn ra mắt):**
1. **Gỡ Socket.IO lỗi + dựng realtime mới (Pusher/Ably) hoặc fallback polling.** (P0-1)
2. **Chuyển sang App Router thật + middleware bảo vệ role + chi tiết sản phẩm là route SSR.** (P0-2)
3. **Tích hợp thanh toán COD + VNPay sandbox + webhook idempotent + bảng Payment.** (P0-3)
4. **Chuẩn hoá mô hình tiền (subtotal/ship/discount/total) + sửa doanh thu dashboard.** (P0-4)

**P1 (hoàn thiện sàn):**
5. **Quản lý kho cho tiểu thương: schema stockQuantity/unit/SKU/StockMovement + trang /seller/kho + trừ kho trong transaction.** (P1-1)
6. **Nâng form đăng bán + trang chi tiết: nhiều ảnh, biến thể, đơn vị, mô tả dài.** (P1-2)
7. **Hệ thống đánh giá verified-purchase + cập nhật rating.** (P1-3)
8. **Sửa số đếm âm ở landing.** (P1-4)
9. **Thêm CSP + headers; validation zod toàn bộ API + rate limit auth.** (P1-5, P1-6)

**P2 (nâng cao):**
10. **Tái cấu trúc Modular Monolith `src/modules/*`.** (§4 bước 1)
11. **Tách service Chat/Realtime + Queue thông báo nếu tải tăng.** (§4 bước 2)
12. **Hoàn thiện checklist từng vai trò §5; thêm test E2E Playwright + CI + Sentry.** (§5, §6)

---

## §8 Gợi ý prompt mẫu để mở từng Task trong Antigravity
```
@workspace Thực hiện Task P0-3 trong ZMARKET_AUDIT_FIX_SPEC.md.
Bối cảnh: Next.js App Router + Prisma. Tạo bảng Payment, route /api/payment/create,
webhook /api/payment/webhook/vnpay (verify vnp_SecureHash SHA512, idempotent),
trang /thanh-toan (COD + VNPay sandbox). Validate bằng zod, tính tiền ở server,
lưu VND dạng Int. Sau khi xong: chạy build/lint, viết 1 test happy-path,
và báo cáo theo Acceptance Criteria của P0-3.
```

— Hết —
