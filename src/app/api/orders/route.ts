import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { sanitizeForStorage } from '@/lib/sanitize'
import { rateLimiters } from '@/lib/rate-limit'
import { z } from 'zod/v4'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '10')), 100)
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    // Filter by role
    if (user.role === 'BUYER') {
      where.buyerId = user.id
    } else if (user.role === 'SELLER') {
      // Get seller's shop
      const shop = await db.shop.findUnique({ where: { ownerId: user.id } })
      if (shop) {
        where.shopId = shop.id
      } else {
        return NextResponse.json({ orders: [], pagination: { page, limit, total: 0, totalPages: 0 } })
      }
    } else if (user.role === 'SHIPPER') {
      where.shipperId = user.id
    }
    // ADMIN can see all orders

    if (status) {
      where.status = status
    }

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        include: {
          buyer: {
            select: { id: true, name: true, phone: true, avatar: true },
          },
          shop: {
            select: { id: true, name: true, image: true, address: true },
          },
          shipper: {
            select: { id: true, name: true, phone: true },
          },
          items: {
            include: {
              product: {
                select: { id: true, name: true, image: true, unit: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.order.count({ where }),
    ])

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}

const createOrderSchema = z.object({
  address: z.string().min(5, 'Vui lòng nhập địa chỉ giao hàng').max(500, 'Địa chỉ quá dài'),
  phone: z.string().min(9, 'Vui lòng nhập số điện thoại hợp lệ').max(20, 'Số điện thoại quá dài'),
  note: z.string().max(1000, 'Ghi chú quá dài').optional(),
  paymentMethod: z.enum(['COD', 'BANKING', 'EWALLET']).default('COD'),
  shippingFee: z.number().min(0).max(500000, 'Phí ship quá cao').default(15000),
})

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const rateLimitResponse = rateLimiters.createOrder(request)
    if (rateLimitResponse) return rateLimitResponse

    const user = await requireAuth()
    const body = await request.json()
    const data = createOrderSchema.parse(body)

    // Get cart items
    const cartItems = await db.cartItem.findMany({
      where: { userId: user.id },
      include: { product: true },
    })

    if (cartItems.length === 0) {
      return NextResponse.json(
        { error: 'Giỏ hàng trống' },
        { status: 400 }
      )
    }

    // Check stock availability for all cart items
    const outOfStockItems = cartItems.filter(item => !item.product.inStock)
    if (outOfStockItems.length > 0) {
      const outOfStockNames = outOfStockItems.map(item => item.product.name).join(', ')
      return NextResponse.json(
        { error: `Sản phẩm không còn hàng: ${outOfStockNames}` },
        { status: 400 }
      )
    }

    // Group items by shop
    const itemsByShop = new Map<string, typeof cartItems>()
    for (const item of cartItems) {
      const shopId = item.product.shopId
      if (!itemsByShop.has(shopId)) {
        itemsByShop.set(shopId, [])
      }
      itemsByShop.get(shopId)!.push(item)
    }

    // Sanitize inputs
    const sanitizedAddress = sanitizeForStorage(data.address)
    const sanitizedPhone = sanitizeForStorage(data.phone)
    const sanitizedNote = data.note ? sanitizeForStorage(data.note) : null

    // Create an order per shop
    const orders = []
    for (const [shopId, items] of itemsByShop) {
      const total = items.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      )

      const order = await db.order.create({
        data: {
          buyerId: user.id,
          shopId,
          total,
          shippingFee: data.shippingFee,
          address: sanitizedAddress,
          phone: sanitizedPhone,
          note: sanitizedNote,
          paymentMethod: data.paymentMethod,
          status: 'PENDING',
          paymentStatus: 'UNPAID',
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.product.price,
            })),
          },
        },
        include: {
          shop: {
            select: { id: true, name: true },
          },
          items: {
            include: {
              product: {
                select: { id: true, name: true, image: true, unit: true },
              },
            },
          },
        },
      })

      orders.push(order)

      // Update sold count for products
      for (const item of items) {
        await db.product.update({
          where: { id: item.productId },
          data: { soldCount: { increment: item.quantity } },
        })
      }
    }

    // Clear cart
    await db.cartItem.deleteMany({
      where: { userId: user.id },
    })

    return NextResponse.json(
      { orders, message: 'Đặt hàng thành công' },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
