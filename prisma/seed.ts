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
    update: { isActive: true },
    create: { email: 'nguoimua@zmarket.vn', password, name: 'Nguyễn Văn Mua', phone: '0901234567', role: Role.BUYER, address: '123 Nguyễn Huệ, Quận 1, TP.HCM' },
  })
  const seller = await prisma.user.upsert({
    where: { email: 'tieuthuong@zmarket.vn' },
    update: { isActive: true },
    create: { email: 'tieuthuong@zmarket.vn', password, name: 'Trần Thị Bưởi', phone: '0912345678', role: Role.SELLER, address: '456 Lê Lợi, Quận 1, TP.HCM' },
  })
  const shipper = await prisma.user.upsert({
    where: { email: 'shipper@zmarket.vn' },
    update: { isActive: true },
    create: { email: 'shipper@zmarket.vn', password, name: 'Phạm Văn Giao', phone: '0923456789', role: Role.SHIPPER, address: '789 Trần Hưng Đạo, Quận 5, TP.HCM' },
  })
  const admin = await prisma.user.upsert({
    where: { email: 'admin@123' },
    update: { isActive: true },
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

  // Clear existing orders/cart/products to avoid foreign key constraints and double insertions
  await prisma.delivery.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.cartItem.deleteMany()
  await prisma.wishlist.deleteMany()
  await prisma.review.deleteMany()
  await prisma.stockMovement.deleteMany()
  await prisma.productVariant.deleteMany()
  await prisma.product.deleteMany()

  for (const p of products) {
    const product = await prisma.product.create({
      data: { ...p, image: p.images[0], shopId: shop.id, isActive: true, weightGram: 1000 },
    })
    // Ghi StockMovement IMPORT ban đầu
    await prisma.stockMovement.create({
      data: { productId: product.id, delta: p.stockQuantity, reason: 'IMPORT', userId: seller.id, note: 'Nhập kho ban đầu' },
    })
  }

  console.log('Seed done!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
