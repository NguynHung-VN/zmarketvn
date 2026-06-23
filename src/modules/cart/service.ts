import { db as prisma } from '@/lib/db'

export class ServiceError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
    this.name = 'ServiceError'
  }
}

export async function getCart(userId: string) {
  let cart = await prisma.cart.findUnique({
    where: { userId },
  })
  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
    })
  }

  const cartItems = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    include: {
      product: {
        include: {
          shop: {
            select: { id: true, name: true },
          },
          category: {
            select: { id: true, name: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const total = cartItems.reduce((sum, item) => {
    return sum + item.product.price * item.quantity
  }, 0)

  return { cartItems, total }
}

export async function addToCart(
  userId: string,
  params: { productId: string; variantId?: string | null; quantity: number }
) {
  const product = await prisma.product.findUnique({ where: { id: params.productId } })
  if (!product) {
    throw new ServiceError(404, 'Không tìm thấy sản phẩm')
  }
  if (!product.inStock) {
    throw new ServiceError(400, 'Sản phẩm đã hết hàng')
  }

  let cart = await prisma.cart.findUnique({
    where: { userId },
  })
  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
    })
  }

  const existingItem = await prisma.cartItem.findFirst({
    where: { cartId: cart.id, productId: params.productId, variantId: params.variantId || null },
  })

  if (existingItem) {
    const updated = await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: existingItem.quantity + params.quantity },
      include: {
        product: {
          include: {
            shop: { select: { id: true, name: true } },
          },
        },
      },
    })
    return { cartItem: updated, message: 'Đã cập nhật giỏ hàng' }
  }

  const cartItem = await prisma.cartItem.create({
    data: {
      cartId: cart.id,
      productId: params.productId,
      variantId: params.variantId || null,
      quantity: params.quantity,
    },
    include: {
      product: {
        include: {
          shop: { select: { id: true, name: true } },
        },
      },
    },
  })

  return { cartItem, message: 'Đã thêm vào giỏ hàng' }
}

export async function updateCartItem(
  userId: string,
  cartItemId: string,
  quantity: number
) {
  const cartItem = await prisma.cartItem.findFirst({
    where: { id: cartItemId, cart: { userId } },
  })

  if (!cartItem) {
    throw new ServiceError(404, 'Không tìm thấy sản phẩm trong giỏ hàng')
  }

  const updated = await prisma.cartItem.update({
    where: { id: cartItemId },
    data: { quantity },
    include: {
      product: {
        include: {
          shop: { select: { id: true, name: true } },
        },
      },
    },
  })

  return { cartItem: updated, message: 'Đã cập nhật' }
}

export async function deleteCartItem(userId: string, cartItemId: string) {
  const cartItem = await prisma.cartItem.findFirst({
    where: { id: cartItemId, cart: { userId } },
  })

  if (!cartItem) {
    throw new ServiceError(404, 'Không tìm thấy sản phẩm trong giỏ hàng')
  }

  await prisma.cartItem.delete({ where: { id: cartItemId } })

  return { message: 'Đã xóa khỏi giỏ hàng' }
}
