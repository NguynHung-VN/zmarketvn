import { db as prisma } from '@/lib/db'

export class ServiceError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
    this.name = 'ServiceError'
  }
}

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
        image: params.images[0] || null,
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
  stockQuantity?: number
  lowStockThreshold?: number
  sku?: string | null
  variants?: { id?: string; name: string; price: number; stockQuantity: number; sku?: string }[]
}) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { shop: true },
  })
  if (!product) throw new ServiceError(404, 'Không tìm thấy sản phẩm')
  if (product.shop.ownerId !== sellerId) throw new ServiceError(403, 'Không có quyền')

  const { variants, ...rest } = data
  const updateData = { ...rest } as any
  if (data.images) {
    updateData.image = data.images[0] || null
  }

  return prisma.$transaction(async (tx) => {
    if (data.stockQuantity !== undefined && data.stockQuantity !== product.stockQuantity) {
      const delta = data.stockQuantity - product.stockQuantity
      await tx.stockMovement.create({
        data: {
          productId,
          delta,
          reason: 'ADJUST',
          note: `Điều chỉnh thủ công từ ${product.stockQuantity} → ${data.stockQuantity}`,
          userId: sellerId,
        },
      })
    }

    const updatedProduct = await tx.product.update({ where: { id: productId }, data: updateData })

    if (variants) {
      const existingVariantIds = variants.map(v => v.id).filter(Boolean) as string[]

      // 1. Safely delete variants no longer present
      const variantsToDelete = await tx.productVariant.findMany({
        where: {
          productId,
          id: { notIn: existingVariantIds }
        },
        include: {
          _count: {
            select: { orderItems: true }
          }
        }
      })

      for (const v of variantsToDelete) {
        if (v._count.orderItems > 0) {
          // ordered: set stock to 0 to prevent FK constraint failure
          await tx.productVariant.update({
            where: { id: v.id },
            data: { stockQuantity: 0 }
          })
        } else {
          // safe to delete
          await tx.productVariant.delete({
            where: { id: v.id }
          })
        }
      }

      // 2. Add or update variants
      for (const v of variants) {
        if (v.id) {
          await tx.productVariant.update({
            where: { id: v.id },
            data: {
              name: v.name,
              price: v.price,
              stockQuantity: v.stockQuantity,
              sku: v.sku,
            }
          })
        } else {
          await tx.productVariant.create({
            data: {
              productId,
              name: v.name,
              price: v.price,
              stockQuantity: v.stockQuantity,
              sku: v.sku,
            }
          })
        }
      }
    }

    return updatedProduct
  })
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
        include: { user: { select: { id: true, name: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  })
  if (!product) throw new ServiceError(404, 'Không tìm thấy sản phẩm')
  return product
}

/** Lấy danh sách sản phẩm công khai */
export async function getProducts(params: {
  page: number
  limit: number
  search?: string
  categoryId?: string
  shopId?: string
  sortBy?: string
  sortOrder?: string
}) {
  const { page, limit, search, categoryId, shopId, sortBy = 'createdAt', sortOrder = 'desc' } = params
  const skip = (page - 1) * limit

  const where: Record<string, any> = {
    inStock: true,
  }

  if (search) {
    where.name = { contains: search }
  }
  if (categoryId) {
    where.categoryId = categoryId
  }
  if (shopId) {
    where.shopId = shopId
  }

  const ALLOWED_SORT_FIELDS = ['createdAt', 'price', 'name', 'rating', 'soldCount']
  const ALLOWED_SORT_ORDERS = ['asc', 'desc']
  const safeSortBy = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : 'createdAt'
  const safeSortOrder = ALLOWED_SORT_ORDERS.includes(sortOrder) ? sortOrder : 'desc'

  const orderBy: Record<string, string> = {
    [safeSortBy]: safeSortOrder,
  }

  const [products, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            image: true,
            rating: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ])

  return {
    products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

/** Lấy sản phẩm cho seller */
export async function getSellerProducts(sellerId: string) {
  const shop = await prisma.shop.findUnique({ where: { ownerId: sellerId } })
  if (!shop) {
    return []
  }

  return prisma.product.findMany({
    where: { shopId: shop.id },
    include: {
      category: {
        select: { id: true, name: true, slug: true },
      },
      _count: {
        select: { orderItems: true, reviews: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

/** Soft delete sản phẩm */
export async function deleteProduct(productId: string, sellerId: string) {
  const shop = await prisma.shop.findUnique({ where: { ownerId: sellerId } })
  if (!shop) throw new ServiceError(404, 'Bạn chưa có sạp hàng')

  const product = await prisma.product.findFirst({
    where: { id: productId, shopId: shop.id },
  })

  if (!product) throw new ServiceError(404, 'Không tìm thấy sản phẩm')

  // Soft delete - mark as out of stock
  return prisma.product.update({
    where: { id: productId },
    data: { inStock: false },
  })
}
