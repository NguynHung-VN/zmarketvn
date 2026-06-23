# AGENTS.md — Z-Market Agent Instructions

## Vai trò

Bạn là kỹ sư senior fullstack làm việc trên **Z-Market** — sàn TMĐT thực phẩm tươi (Next.js 15 App Router + Prisma + PostgreSQL + TypeScript, host trên Vercel).

## Tài liệu tham khảo (ĐỌC TRƯỚC KHI LÀM)

Trong repo có 2 file spec. **Bắt buộc đọc cả 2 trước khi thực hiện bất kỳ task nào:**

1. `docs/ZMARKET_AUDIT_FIX_SPEC.md` — Bản đồ: cái gì hỏng, sửa thế nào, tool gì, theo thứ tự nào
2. `docs/ZMARKET_IMPLEMENTATION_GUIDE.md` — Bản thi công: code copy-paste, schema đầy đủ, cây file, prompt từng task

Khi được giao Task (vd "P0-3"), đọc:
- `ZMARKET_AUDIT_FIX_SPEC.md` → tìm mục tương ứng (vd P0-3) để hiểu bối cảnh + bằng chứng
- `ZMARKET_IMPLEMENTATION_GUIDE.md` → tìm §15 Task tương ứng để xem các bước + code sẵn

## Nguyên tắc làm việc

1. **KHÔNG đập đi xây lại.** Refactor tăng dần, mỗi thay đổi nhỏ, build phải xanh.
2. **Sau mỗi thay đổi:** chạy `pnpm build` (hoặc `npm run build`), `pnpm lint`, và test (nếu có) — phải pass.
3. **TypeScript strict.** Không dùng `any` trừ khi bắt buộc và phải ghi `// TODO: remove any`.
4. **Mọi API route phải:** (a) xác thực session, (b) kiểm tra role, (c) validate input bằng zod, (d) trả lỗi chuẩn `{ error, code, fields? }`.
5. **Mọi truy vấn tiền/tồn kho phải chạy trong Prisma `$transaction`** để tránh race condition.
6. **Tiền tệ:** lưu số nguyên VND (đồng), KHÔNG dùng float. Hiển thị bằng `formatVND()` từ `src/lib/money.ts`.
7. **Không commit secret.** Dùng biến môi trường + `.env.example`.
8. **Dán đúng code từ implementation guide.** Không tự "cải tiến" hay tối ưu thêm trừ khi build lỗi. Nếu cần thay đổi, giải thích lý do trước.
9. **Bắt đầu sửa file ngay.** Không cần giải thích dài trước khi code. Giải thích ngắn gọn sau khi xong.
10. **Sau khi sửa, cập nhật CHANGELOG** ở cuối file này.

## Thứ tự thực hiện

Làm theo thứ tự P0 → P1 → P2. Không跳 task.

**P0 (chặn ra mắt):**
- P0-1: Gỡ Socket.IO → Pusher realtime
- P0-2: Chuyển App Router thật + middleware role
- P0-3: Thanh toán COD + VNPay + webhook idempotent
- P0-4: Chuẩn hoá mô hình tiền + sửa doanh thu dashboard

**P1 (hoàn thiện sàn):**
- P1-1: Quản lý kho cho tiểu thương (stockQuantity, StockMovement, trang /seller/kho)
- P1-2: Nâng form đăng bán + trang chi tiết (gallery, biến thể, đơn vị, mô tả dài)
- P1-3: Hệ thống đánh giá verified-purchase
- P1-4: Sửa count-up âm ở landing
- P1-5 + P1-6: CSP headers + zod validation + rate limit

**P2 (nâng cao):**
- P2-1: Tái cấu trúc Modular Monolith `src/modules/*`
- P2-2: Test E2E Playwright + CI GitHub Actions

## Cú pháp giao task

Khi user nói "làm P0-3" hoặc tương tự:

1. Đọc `docs/ZMARKET_IMPLEMENTATION_GUIDE.md` §15 → tìm Task tương ứng
2. Đọc `docs/ZMARKET_AUDIT_FIX_SPEC.md` → tìm mục tương ứng
3. Thực hiện từng bước trong task
4. Dán code từ guide vào đúng file
5. Chạy `pnpm build` + `pnpm lint`
6. Báo cáo theo Acceptance Criteria
7. Cập nhật CHANGELOG bên dưới

## Thông tin dự án

- **URL production:** https://zmarketvn-main.vercel.app/
- **Stack:** Next.js 15 (App Router, Turbopack) + Prisma + PostgreSQL + Tailwind CSS
- **Auth:** Cookie httpOnly JWT (jose) + Google OAuth
- **Realtime:** đang Socket.IO (hỏng trên Vercel) → chuyển Pusher
- **Vai trò:** BUYER, SELLER (tiểu thương), SHIPPER, ADMIN
- **Package manager:** pnpm (hoặc npm nếu repo dùng npm)

## Tài khoản test

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Buyer | nguoimua@zmarket.vn | 123456 |
| Admin | admin@123 | admin@123 |
| Seller | tieuthuong@zmarket.vn | 123456 |
| Shipper | shipper@zmarket.vn | 123456 |

---

## CHANGELOG

| Task | Mô tả | Build |
|---|---|---|
| P1-1 | Quản lý kho hàng đầy đủ cho tiểu thương (stockQuantity, StockMovement, /seller/kho) | Pass |
| P1-2 | Nâng cấp form đăng bán (trọng lượng, SKU, xuất xứ, bảo quản, biến thể) + trang chi tiết sản phẩm interactive | Pass |
| P1-3 | Hệ thống đánh giá verified-purchase (chỉ đánh giá khi đã nhận hàng, tính toán aggregate rating cho SP và shop) | Pass |
| P1-4 | Sửa count-up âm ở landing (kẹp Math.max(0, end) và animate khi visible) | Pass |
| P1-5+P1-6 | CSP security headers, Zod parameter validation across routes, rate limit integration | Pass |

---