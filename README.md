# 🥬 ZMarketVN — Chợ Số Việt Nam

Marketplace số hóa chợ truyền thống Việt Nam — kết nối người mua, tiểu thương, shipper và quản trị viên.

## 🛠 Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Database**: Prisma ORM (SQLite cho dev, PostgreSQL cho production)
- **Real-time Chat**: Socket.io
- **File Upload**: Cloudinary (production) / Local filesystem (dev)
- **State**: Zustand + TanStack Query

## 🚀 Quick Start

```bash
# Install dependencies
bun install

# Setup database
bun run db:push
bun run db:seed

# Start dev server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🔑 Test Accounts

| Role | Email | Password |
|------|-------|----------|
| 👤 Người mua | nguoimua@zmarket.vn | 123456 |
| 🏪 Tiểu thương | tieuthuong@zmarket.vn | 123456 |
| 🚚 Shipper | shipper@zmarket.vn | 123456 |
| 🛡️ Admin | admin@123 | admin@123 |

## ☁️ Deploy to Vercel

See [`.env.example`](.env.example) for detailed setup instructions.

### Required Services (All FREE):
- **Database**: [Neon PostgreSQL](https://neon.tech) (0.5GB free)
- **File Upload**: [Cloudinary](https://cloudinary.com) (25GB free)
- **Hosting**: [Vercel](https://vercel.com) (Hobby free)

### Steps:
1. Copy `.env.example` → set up environment variables in Vercel Dashboard
2. Push to GitHub → connect to Vercel
3. Run `prisma db push` + `prisma db seed` with production DATABASE_URL
4. Done! 🎉

### Chat Service (Optional):
Socket.io chat needs a long-running server. Deploy separately on [Render.com](https://render.com) (free tier):
```bash
cd mini-services/chat-service
bun install
# Set DATABASE_URL, COOKIE_SECRET, ALLOWED_ORIGINS env vars
bun start
```

## 📁 Project Structure

```
src/
├── app/
│   ├── api/           # API routes (auth, products, orders, chat, etc.)
│   └── page.tsx       # SPA entry point
├── components/
│   ├── ui/            # shadcn/ui components
│   └── zmarket/       # App-specific components
├── lib/               # Utilities (auth, db, cloudinary, csrf, etc.)
prisma/
├── schema.prisma              # Current schema (SQLite for dev)
├── schema.sqlite.prisma       # SQLite schema
└── schema.postgresql.prisma   # PostgreSQL schema (for Vercel)
mini-services/
└── chat-service/      # Socket.io chat service (port 3003)
```

## 📄 License

Private project
