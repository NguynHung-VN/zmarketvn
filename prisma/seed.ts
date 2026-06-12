import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const SALT_ROUNDS = 10

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

// Real images from image search
const IMG = {
  vegetables: [
    "https://sfile.chatglm.cn/images-ppt/3f68734c3908.jpeg",
    "https://sfile.chatglm.cn/images-ppt/33d22c2149e1.jpg",
    "https://sfile.chatglm.cn/images-ppt/ac93ae2fdeda.jpg",
    "https://sfile.chatglm.cn/images-ppt/bd5402fc4d51.jpg",
    "https://sfile.chatglm.cn/images-ppt/1ca79b83d791.jpg"
  ],
  fruits: [
    "https://sfile.chatglm.cn/images-ppt/4d519899ea23.jpg",
    "https://sfile.chatglm.cn/images-ppt/d85ba693b6de.jpg",
    "https://sfile.chatglm.cn/images-ppt/0d655d8a2f4e.jpg",
    "https://sfile.chatglm.cn/images-ppt/8119f53083e5.jpg",
    "https://sfile.chatglm.cn/images-ppt/d273821412a9.jpg"
  ],
  meatFish: [
    "https://sfile.chatglm.cn/images-ppt/32c2ad0b51f0.jpg",
    "https://sfile.chatglm.cn/images-ppt/a4553cfdd078.jpg",
    "https://sfile.chatglm.cn/images-ppt/792f935ad3dd.jpg",
    "https://sfile.chatglm.cn/images-ppt/9d1a0b415074.jpg"
  ],
  spices: [
    "https://sfile.chatglm.cn/images-ppt/0cb057d51c18.jpg",
    "https://sfile.chatglm.cn/images-ppt/eb0424f225c0.jpg",
    "https://sfile.chatglm.cn/images-ppt/346737a6e92f.png"
  ],
  dryGoods: [
    "https://sfile.chatglm.cn/images-ppt/e3aeb2572a27.jpg",
    "https://sfile.chatglm.cn/images-ppt/41a0e79b6269.png",
    "https://sfile.chatglm.cn/images-ppt/f90bfb6c4278.png"
  ],
  drinks: [
    "https://sfile.chatglm.cn/images-ppt/9dfdf801d403.jpg",
    "https://sfile.chatglm.cn/images-ppt/5cd1d495c407.jpg",
    "https://sfile.chatglm.cn/images-ppt/46d2b8ef57f1.jpg"
  ],
  shops: [
    "https://sfile.chatglm.cn/images-ppt/cddf15cb43ef.jpeg",
    "https://sfile.chatglm.cn/images-ppt/fcb8cb1247ff.jpg",
    "https://sfile.chatglm.cn/images-ppt/8b0b6f36f4f6.jpg",
    "https://sfile.chatglm.cn/images-ppt/950eb89ff455.jpg"
  ],
  hero: [
    "https://sfile.chatglm.cn/images-ppt/3af2830a2b53.jpg",
    "https://sfile.chatglm.cn/images-ppt/a18eb3b1be67.jpg",
    "https://sfile.chatglm.cn/images-ppt/5ca66f18e404.jpg"
  ]
}

async function main() {
  console.log('🌱 Seeding database...')

  // Clean existing data
  await prisma.productImage.deleteMany()
  await prisma.message.deleteMany()
  await prisma.participant.deleteMany()
  await prisma.conversation.deleteMany()
  await prisma.feedback.deleteMany()
  await prisma.review.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.cartItem.deleteMany()
  await prisma.wishlistItem.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.shop.deleteMany()
  await prisma.user.deleteMany()

  // ==================== Users ====================
  console.log('Creating users (hashing passwords with bcrypt)...')

  const [buyerPw, adminPw, seller1Pw, seller2Pw, seller3Pw, seller4Pw, shipperPw, buyer2Pw] = await Promise.all([
    hashPassword('123456'),
    hashPassword('admin@123'),
    hashPassword('123456'),
    hashPassword('123456'),
    hashPassword('123456'),
    hashPassword('123456'),
    hashPassword('123456'),
    hashPassword('123456'),
  ])

  const buyer = await prisma.user.create({
    data: {
      name: 'Nguyễn Văn Mua',
      email: 'nguoimua@zmarket.vn',
      password: buyerPw,
      phone: '0901234567',
      address: '123 Nguyễn Huệ, Quận 1, TP.HCM',
      role: 'BUYER',
    },
  })

  const admin = await prisma.user.create({
    data: {
      name: 'Quản Trị Viên',
      email: 'admin@123',
      password: adminPw,
      phone: '0900000000',
      address: 'ZMarket HQ, Quận 1, TP.HCM',
      role: 'ADMIN',
    },
  })

  const seller1 = await prisma.user.create({
    data: {
      name: 'Trần Thị Bưởi',
      email: 'tieuthuong@zmarket.vn',
      password: seller1Pw,
      phone: '0912345678',
      address: '456 Lê Lợi, Quận 1, TP.HCM',
      role: 'SELLER',
    },
  })

  const seller2 = await prisma.user.create({
    data: {
      name: 'Lê Văn Sản',
      email: 'levansan@zmarket.vn',
      password: seller2Pw,
      phone: '0923456789',
      address: '789 Hà Huy Giáp, Quận Thốt Nốt, Cần Thơ',
      role: 'SELLER',
    },
  })

  const seller3 = await prisma.user.create({
    data: {
      name: 'Phạm Thị Hoa',
      email: 'phamthihoa@zmarket.vn',
      password: seller3Pw,
      phone: '0934567890',
      address: '321 Lý Thường Kiệt, Quận 10, TP.HCM',
      role: 'SELLER',
    },
  })

  const seller4 = await prisma.user.create({
    data: {
      name: 'Hoàng Minh Tươi',
      email: 'hoangminhtuoi@zmarket.vn',
      password: seller4Pw,
      phone: '0945678901',
      address: '654 Phan Xích Long, Phú Nhuận, TP.HCM',
      role: 'SELLER',
    },
  })

  const shipper = await prisma.user.create({
    data: {
      name: 'Phạm Văn Giao',
      email: 'shipper@zmarket.vn',
      password: shipperPw,
      phone: '0956789012',
      address: '888 Cách Mạng Tháng 8, Quận 3, TP.HCM',
      role: 'SHIPPER',
    },
  })

  const buyer2 = await prisma.user.create({
    data: {
      name: 'Võ Thị Lan',
      email: 'vothilan@zmarket.vn',
      password: buyer2Pw,
      phone: '0967890123',
      address: '999 Võ Văn Tần, Quận 3, TP.HCM',
      role: 'BUYER',
    },
  })

  console.log('Users created!')

  // ==================== Categories ====================
  console.log('Creating categories...')

  const rauCu = await prisma.category.create({
    data: { name: 'Rau củ', slug: 'rau-cu', icon: '🥬' },
  })
  const traiCay = await prisma.category.create({
    data: { name: 'Trái cây', slug: 'trai-cay', icon: '🍎' },
  })
  const thiCa = await prisma.category.create({
    data: { name: 'Thịt cá', slug: 'thit-ca', icon: '🍖' },
  })
  const giaVi = await prisma.category.create({
    data: { name: 'Gia vị', slug: 'gia-vi', icon: '🌶️' },
  })
  const doKho = await prisma.category.create({
    data: { name: 'Đồ khô', slug: 'do-kho', icon: '🫘' },
  })
  const doUong = await prisma.category.create({
    data: { name: 'Đồ uống', slug: 'do-uong', icon: '🥤' },
  })

  console.log('Categories created!')

  // ==================== Shops ====================
  console.log('Creating shops...')

  const shop1 = await prisma.shop.create({
    data: {
      name: 'Vườn Nhà Bưởi',
      description: 'Rau củ quả tươi sạch từ vườn nhà, không hóa chất. Giao hàng nhanh chóng trong 2h!',
      image: IMG.shops[0],
      address: '456 Lê Lợi, Quận 1, TP.HCM',
      phone: '0912345678',
      rating: 4.8,
      ownerId: seller1.id,
    },
  })

  const shop2 = await prisma.shop.create({
    data: {
      name: 'Cửa Hàng Sản Xanh',
      description: 'Thực phẩm sạch từ Cần Thơ - ĐBSCL. Nông sản đặc sản miền Tây giao tận nơi.',
      image: IMG.shops[1],
      address: '789 Hà Huy Giáp, Quận Thốt Nốt, Cần Thơ',
      phone: '0923456789',
      rating: 4.6,
      ownerId: seller2.id,
    },
  })

  const shop3 = await prisma.shop.create({
    data: {
      name: 'Hoa Fresh Market',
      description: 'Thịt cá tươi sống mỗi ngày. Nhập hàng trực tiếp từ chợ đầu mối.',
      image: IMG.shops[2],
      address: '321 Lý Thường Kiệt, Quận 10, TP.HCM',
      phone: '0934567890',
      rating: 4.5,
      ownerId: seller3.id,
    },
  })

  const shop4 = await prisma.shop.create({
    data: {
      name: 'Tươi Mỗi Ngày',
      description: 'Đồ khô, gia vị, đồ uống - đủ mọi thứ cho gian bếp Việt.',
      image: IMG.shops[3],
      address: '654 Phan Xích Long, Phú Nhuận, TP.HCM',
      phone: '0945678901',
      rating: 4.3,
      ownerId: seller4.id,
    },
  })

  console.log('Shops created!')

  // ==================== Products ====================
  console.log('Creating products...')

  const products = [
    // Rau củ - Shop 1
    { name: 'Rau muống', description: 'Rau muống tươi ngon, hái sáng giao trưa', price: 15000, originalPrice: 20000, unit: 'mớ', image: IMG.vegetables[0], categoryId: rauCu.id, shopId: shop1.id, soldCount: 156 },
    { name: 'Cải ngọt', description: 'Cải ngọt Đà Lạt xanh mướt, giòn ngọt', price: 18000, originalPrice: 22000, unit: 'kg', image: IMG.vegetables[1], categoryId: rauCu.id, shopId: shop1.id, soldCount: 89 },
    { name: 'Cà chua', description: 'Cà chua mọng nước, đỏ au tự nhiên', price: 25000, unit: 'kg', image: IMG.vegetables[2], categoryId: rauCu.id, shopId: shop1.id, soldCount: 234 },
    { name: 'Khoai tây', description: 'Khoai tây Đà Lạt bùi bùi, vàng ươm', price: 28000, unit: 'kg', image: IMG.vegetables[3], categoryId: rauCu.id, shopId: shop1.id, soldCount: 67 },
    { name: 'Hành lá', description: 'Hành lá tươi xanh, thơm lừng', price: 10000, unit: 'mớ', image: IMG.vegetables[4], categoryId: rauCu.id, shopId: shop1.id, soldCount: 198 },

    // Trái cây - Shop 1
    { name: 'Xoài cát Hòa Lộc', description: 'Xoài cát Hòa Lộc ngọt lịm, trĩu quả', price: 65000, originalPrice: 80000, unit: 'kg', image: IMG.fruits[0], categoryId: traiCay.id, shopId: shop1.id, soldCount: 312 },
    { name: 'Chuối sứ', description: 'Chuối sứ chín vàng, ngọt thơm', price: 20000, unit: 'nải', image: IMG.fruits[1], categoryId: traiCay.id, shopId: shop1.id, soldCount: 145 },
    { name: 'Dưa hấu', description: 'Dưa hấu đỏ ngọt, mát lạnh', price: 18000, unit: 'kg', image: IMG.fruits[2], categoryId: traiCay.id, shopId: shop1.id, soldCount: 78 },
    { name: 'Sầu riêng Ri6', description: 'Sầu riêng Ri6 Cái Mơn - Vua sầu riêng', price: 120000, originalPrice: 150000, unit: 'kg', image: IMG.fruits[3], categoryId: traiCay.id, shopId: shop1.id, soldCount: 56 },

    // Rau củ - Shop 2
    { name: 'Bầu', description: 'Bầu non giòn ngọt, nấu canh tuyệt ngon', price: 12000, unit: 'quả', image: IMG.vegetables[0], categoryId: rauCu.id, shopId: shop2.id, soldCount: 45 },
    { name: 'Bí xanh', description: 'Bí xanh mướt, nấu soup bổ dưỡng', price: 15000, unit: 'kg', image: IMG.vegetables[1], categoryId: rauCu.id, shopId: shop2.id, soldCount: 32 },
    { name: 'Rau dền', description: 'Rau dền đỏ giàu sắt, mát lành', price: 8000, unit: 'mớ', image: IMG.vegetables[2], categoryId: rauCu.id, shopId: shop2.id, soldCount: 78 },

    // Trái cây - Shop 2
    { name: 'Bưởi Năm Roi', description: 'Bưởi Năm Roi Vĩnh Long ngọt thanh, vỏ mỏng', price: 35000, originalPrice: 42000, unit: 'kg', image: IMG.fruits[4], categoryId: traiCay.id, shopId: shop2.id, soldCount: 189 },
    { name: 'Măng cụt', description: 'Măng cụt Trà Vinh ngọt lịm, trắng ngà', price: 55000, unit: 'kg', image: IMG.fruits[0], categoryId: traiCay.id, shopId: shop2.id, soldCount: 67 },

    // Thịt cá - Shop 3
    { name: 'Thịt heo ba chỉ', description: 'Ba chỉ heo tươi, lớp nạc mỡ xen kẽ đẹp', price: 130000, originalPrice: 145000, unit: 'kg', image: IMG.meatFish[0], categoryId: thiCa.id, shopId: shop3.id, soldCount: 456 },
    { name: 'Cá basa fillet', description: 'Cá basa fillet tươi, thịt trắng ngần', price: 85000, unit: 'kg', image: IMG.meatFish[1], categoryId: thiCa.id, shopId: shop3.id, soldCount: 123 },
    { name: 'Tôm thẻ chân trắng', description: 'Tôm thẻ chân trắng tươi rói, size 30-40', price: 220000, originalPrice: 250000, unit: 'kg', image: IMG.meatFish[2], categoryId: thiCa.id, shopId: shop3.id, soldCount: 89 },
    { name: 'Gà ta nguyên con', description: 'Gà ta thả vườn, thịt chắc thơm', price: 180000, unit: 'con', image: IMG.meatFish[3], categoryId: thiCa.id, shopId: shop3.id, soldCount: 67 },
    { name: 'Thịt bò bắp', description: 'Bắp bò tươi mềm, nhập buổi sáng', price: 320000, unit: 'kg', image: IMG.meatFish[0], categoryId: thiCa.id, shopId: shop3.id, soldCount: 34 },

    // Gia vị - Shop 4
    { name: 'Nước mắm Phú Quốc', description: 'Nước mắm nhĩ Phú Quốc 40 độ đạm', price: 75000, originalPrice: 90000, unit: 'chai 500ml', image: IMG.spices[0], categoryId: giaVi.id, shopId: shop4.id, soldCount: 567 },
    { name: 'Muối biển', description: 'Muối biển tinh khiết, vị mặn dịu', price: 12000, unit: 'gói 500g', image: IMG.spices[1], categoryId: giaVi.id, shopId: shop4.id, soldCount: 234 },
    { name: 'Tiêu đen sọ', description: 'Tiêu đen Phú Quốc thơm nức mũi', price: 45000, unit: 'gói 200g', image: IMG.spices[2], categoryId: giaVi.id, shopId: shop4.id, soldCount: 145 },
    { name: 'Nấm mèo khô', description: 'Nấm mèo khô loại 1, nở đều', price: 55000, unit: 'gói 250g', image: IMG.spices[0], categoryId: giaVi.id, shopId: shop4.id, soldCount: 78 },

    // Đồ khô - Shop 4
    { name: 'Gạo ST25', description: 'Gạo ST25 - Gạo ngon nhất thế giới', price: 32000, originalPrice: 38000, unit: 'kg', image: IMG.dryGoods[0], categoryId: doKho.id, shopId: shop4.id, soldCount: 890 },
    { name: 'Miến đồng', description: 'Miến đồng thơm dẻo, nấu gà dễ nấu', price: 35000, unit: 'gói 400g', image: IMG.dryGoods[1], categoryId: doKho.id, shopId: shop4.id, soldCount: 123 },
    { name: 'Bánh phở tươi', description: 'Bánh phở tươi dai mềm, nấu phở chuẩn vị', price: 25000, unit: 'gói 500g', image: IMG.dryGoods[2], categoryId: doKho.id, shopId: shop4.id, soldCount: 67 },
    { name: 'Bún gạo', description: 'Bún gạo khô loại đặc biệt', price: 22000, unit: 'gói 400g', image: IMG.dryGoods[0], categoryId: doKho.id, shopId: shop4.id, soldCount: 56 },

    // Đồ uống - Shop 4
    { name: 'Cà phê sữa đá', description: 'Cà phê sữa đá pha sẵn, đậm đà vị Việt', price: 25000, unit: 'ly', image: IMG.drinks[0], categoryId: doUong.id, shopId: shop4.id, soldCount: 345 },
    { name: 'Trà đá chanh', description: 'Trà đá chanh mát lạnh, giải nhiệt mùa hè', price: 15000, unit: 'ly', image: IMG.drinks[1], categoryId: doUong.id, shopId: shop4.id, soldCount: 234 },
    { name: 'Nước dừa tươi', description: 'Nước dừa tươi Bến Tre, thanh mát', price: 20000, unit: 'quả', image: IMG.drinks[2], categoryId: doUong.id, shopId: shop4.id, soldCount: 178 },
    { name: 'Sữa đậu nành', description: 'Sữa đậu nành nguyên chất, không đường', price: 18000, unit: 'chai 500ml', image: IMG.drinks[0], categoryId: doUong.id, shopId: shop4.id, soldCount: 89 },
  ]

  const createdProducts = []
  for (const product of products) {
    const p = await prisma.product.create({ data: product })
    createdProducts.push(p)
  }

  console.log(`${createdProducts.length} products created!`)

  // ==================== Cart Items ====================
  console.log('Creating cart items...')

  await prisma.cartItem.createMany({
    data: [
      { userId: buyer.id, productId: createdProducts[0].id, quantity: 2 },
      { userId: buyer.id, productId: createdProducts[5].id, quantity: 1 },
      { userId: buyer.id, productId: createdProducts[22].id, quantity: 3 },
      { userId: buyer2.id, productId: createdProducts[15].id, quantity: 1 },
      { userId: buyer2.id, productId: createdProducts[18].id, quantity: 2 },
    ],
  })

  console.log('Cart items created!')

  // ==================== Orders ====================
  console.log('Creating orders...')

  const order1 = await prisma.order.create({
    data: {
      buyerId: buyer.id,
      shopId: shop1.id,
      total: 55000,
      shippingFee: 15000,
      address: '123 Nguyễn Huệ, Quận 1, TP.HCM',
      phone: '0901234567',
      note: 'Giao giờ hành chính',
      paymentMethod: 'COD',
      status: 'DELIVERED',
      paymentStatus: 'PAID',
      shipperId: shipper.id,
      items: {
        create: [
          { productId: createdProducts[0].id, quantity: 2, price: 15000 },
          { productId: createdProducts[5].id, quantity: 1, price: 25000 },
        ],
      },
    },
  })

  const order2 = await prisma.order.create({
    data: {
      buyerId: buyer.id,
      shopId: shop4.id,
      total: 96000,
      shippingFee: 15000,
      address: '123 Nguyễn Huệ, Quận 1, TP.HCM',
      phone: '0901234567',
      paymentMethod: 'COD',
      status: 'SHIPPING',
      paymentStatus: 'UNPAID',
      shipperId: shipper.id,
      items: {
        create: [
          { productId: createdProducts[22].id, quantity: 3, price: 32000 },
        ],
      },
    },
  })

  const order3 = await prisma.order.create({
    data: {
      buyerId: buyer.id,
      shopId: shop3.id,
      total: 215000,
      shippingFee: 15000,
      address: '123 Nguyễn Huệ, Quận 1, TP.HCM',
      phone: '0901234567',
      note: 'Cho xem hàng trước khi thanh toán',
      paymentMethod: 'COD',
      status: 'CONFIRMED',
      paymentStatus: 'UNPAID',
      items: {
        create: [
          { productId: createdProducts[15].id, quantity: 1, price: 130000 },
          { productId: createdProducts[18].id, quantity: 1, price: 85000 },
        ],
      },
    },
  })

  const order4 = await prisma.order.create({
    data: {
      buyerId: buyer2.id,
      shopId: shop1.id,
      total: 70000,
      shippingFee: 15000,
      address: '999 Võ Văn Tần, Quận 3, TP.HCM',
      phone: '0967890123',
      paymentMethod: 'BANKING',
      status: 'PREPARING',
      paymentStatus: 'PAID',
      items: {
        create: [
          { productId: createdProducts[2].id, quantity: 1, price: 25000 },
          { productId: createdProducts[6].id, quantity: 1, price: 20000 },
          { productId: createdProducts[8].id, quantity: 1, price: 25000 },
        ],
      },
    },
  })

  const order5 = await prisma.order.create({
    data: {
      buyerId: buyer2.id,
      shopId: shop4.id,
      total: 75000,
      shippingFee: 15000,
      address: '999 Võ Văn Tần, Quận 3, TP.HCM',
      phone: '0967890123',
      paymentMethod: 'COD',
      status: 'PENDING',
      paymentStatus: 'UNPAID',
      items: {
        create: [
          { productId: createdProducts[22].id, quantity: 1, price: 32000 },
          { productId: createdProducts[28].id, quantity: 1, price: 25000 },
          { productId: createdProducts[18].id, quantity: 1, price: 18000 },
        ],
      },
    },
  })

  console.log('Orders created!')

  // ==================== Reviews ====================
  console.log('Creating reviews...')

  await prisma.review.createMany({
    data: [
      { userId: buyer.id, productId: createdProducts[0].id, rating: 5, comment: 'Rau muống tươi lắm, giòn và ngọt. Sẽ mua lại!' },
      { userId: buyer.id, productId: createdProducts[5].id, rating: 5, comment: 'Xoài cát ngọt lịm tim, lớp vỏ mỏng dính. Tuyệt vời!' },
      { userId: buyer.id, productId: createdProducts[22].id, rating: 4, comment: 'Gạo ST25 dẻo thơm, nấu cơm rất ngon' },
      { userId: buyer2.id, productId: createdProducts[2].id, rating: 4, comment: 'Cà chua đỏ au, mọng nước, nấu canh chua ngon' },
      { userId: buyer2.id, productId: createdProducts[6].id, rating: 5, comment: 'Chuối sứ ngọt thơm, chín vừa tới' },
      { userId: buyer2.id, productId: createdProducts[15].id, rating: 4, comment: 'Thịt ba chỉ tươi, nướng rất ngon' },
      { userId: buyer.id, productId: createdProducts[19].id, rating: 5, comment: 'Nước mắm Phú Quốc thơm nức, đạm thật!' },
      { userId: buyer.id, productId: createdProducts[9].id, rating: 3, comment: 'Bầu hơi già nhưng được cái tươi' },
    ],
  })

  console.log('Reviews created!')

  // ==================== Update ratings ====================
  console.log('Updating product ratings...')

  const productRatings = await prisma.review.groupBy({
    by: ['productId'],
    _avg: { rating: true },
  })

  for (const pr of productRatings) {
    if (pr.productId && pr._avg.rating) {
      await prisma.product.update({
        where: { id: pr.productId },
        data: { rating: Math.round(pr._avg.rating * 10) / 10 },
      })
    }
  }

  // ==================== Conversations ====================
  console.log('Creating conversations...')

  const conv1 = await prisma.conversation.create({
    data: {
      type: 'DIRECT',
      participants: {
        create: [
          { userId: buyer.id },
          { userId: seller1.id },
        ],
      },
    },
  })

  const conv2 = await prisma.conversation.create({
    data: {
      type: 'DIRECT',
      participants: {
        create: [
          { userId: buyer.id },
          { userId: seller3.id },
        ],
      },
    },
  })

  const conv3 = await prisma.conversation.create({
    data: {
      type: 'DIRECT',
      participants: {
        create: [
          { userId: shipper.id },
          { userId: seller1.id },
        ],
      },
    },
  })

  const conv4 = await prisma.conversation.create({
    data: {
      type: 'SUPPORT',
      name: 'Hỗ trợ người mua',
      participants: {
        create: [
          { userId: buyer.id },
          { userId: admin.id },
        ],
      },
    },
  })

  console.log('Conversations created!')

  // ==================== Messages ====================
  console.log('Creating messages...')

  await prisma.message.createMany({
    data: [
      // Buyer - Seller1 conversation
      { conversationId: conv1.id, senderId: buyer.id, content: 'Chào chị, rau muống hôm nay còn không ạ?', type: 'TEXT' },
      { conversationId: conv1.id, senderId: seller1.id, content: 'Còn cháu ơi, tươi lắm sáng mới hái xong!', type: 'TEXT' },
      { conversationId: conv1.id, senderId: buyer.id, content: 'Vậy cho cháu 2 mớ nhé, giao buổi chiều được không?', type: 'TEXT' },
      { conversationId: conv1.id, senderId: seller1.id, content: 'Được cháu ơi, tầm 3-4h chiều shipper sẽ giao nhé!', type: 'TEXT' },
      { conversationId: conv1.id, senderId: buyer.id, content: 'Dạ vâng, cảm ơn chị!', type: 'TEXT' },

      // Buyer - Seller3 conversation
      { conversationId: conv2.id, senderId: buyer.id, content: 'Thịt ba chỉ bao nhiêu 1kg chị ơi?', type: 'TEXT' },
      { conversationId: conv2.id, senderId: seller3.id, content: '130k/kg cháu ơi, tươi lắm nhập sáng nay!', type: 'TEXT' },
      { conversationId: conv2.id, senderId: buyer.id, content: 'OK đặt 1kg nhé', type: 'TEXT' },

      // Shipper - Seller1 conversation
      { conversationId: conv3.id, senderId: seller1.id, content: 'Anh ơi, có đơn giao Quận 1 giúp em với', type: 'TEXT' },
      { conversationId: conv3.id, senderId: shipper.id, content: 'OK em, anh đang ở gần đó, 10 phút nữa lấy hàng', type: 'TEXT' },
      { conversationId: conv3.id, senderId: seller1.id, content: 'Dạ em chuẩn bị sẵn rồi anh ơi!', type: 'TEXT' },

      // Buyer - Admin support conversation
      { conversationId: conv4.id, senderId: buyer.id, content: 'Xin chào, tôi muốn hỏi về chính sách đổi trả hàng', type: 'TEXT' },
      { conversationId: conv4.id, senderId: admin.id, content: 'Chào bạn! Z-Market hỗ trợ đổi trả trong 24h nếu sản phẩm không đúng mô tả. Bạn cần hỗ trợ thêm gì không ạ?', type: 'TEXT' },
    ],
  })

  console.log('Messages created!')

  // ==================== Feedback ====================
  console.log('Creating feedback...')

  await prisma.feedback.createMany({
    data: [
      {
        userId: buyer.id,
        subject: 'Giao hàng chậm',
        content: 'Hôm nay tôi đặt hàng lúc 10h sáng nhưng đến 6h chiều mới nhận được. Mong cải thiện tốc độ giao hàng.',
        type: 'COMPLAINT',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
      },
      {
        userId: buyer.id,
        subject: 'Tính năng yêu thích',
        content: 'Rất thích tính năng theo dõi đơn hàng real-time. Mong app thêm tính năng so sánh giá giữa các sạp hàng.',
        type: 'SUGGESTION',
        status: 'PENDING',
        priority: 'MEDIUM',
      },
      {
        userId: seller1.id,
        subject: 'Ứng dụng rất tốt',
        content: 'Từ khi lên Z-Market, sạp hàng của tôi tiếp cận được nhiều khách hàng hơn. Giao diện dễ sử dụng, quản lý đơn hàng tiện lợi.',
        type: 'FEEDBACK',
        status: 'RESOLVED',
        priority: 'LOW',
        adminReply: 'Cảm ơn bạn đã tin dùng Z-Market! Chúng tôi sẽ tiếp tục cải thiện để phục vụ bạn tốt hơn.',
        repliedBy: admin.id,
      },
      {
        userId: shipper.id,
        subject: 'Lỗi hiển thị bản đồ',
        content: 'Khi nhận đơn giao hàng, bản đồ đôi khi không hiển thị chính xác vị trí người mua. Xin kiểm tra lại.',
        type: 'BUG_REPORT',
        status: 'PENDING',
        priority: 'URGENT',
      },
    ],
  })

  console.log('Feedback created!')

  console.log('✅ Seeding complete!')
  console.log(`
  📊 Summary:
  - Users: 7 (1 admin, 4 sellers, 1 shipper, 2 buyers)
  - Categories: 6
  - Shops: 4
  - Products: ${createdProducts.length}
  - Orders: 5
  - Reviews: 8
  - Conversations: 4
  - Messages: 12
  - Feedback: 4
  
  🔑 Test Accounts:
  - Buyer:   nguoimua@zmarket.vn / 123456
  - Admin:   admin@123 / admin@123
  - Seller:  tieuthuong@zmarket.vn / 123456
  - Shipper: shipper@zmarket.vn / 123456
  `)
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
