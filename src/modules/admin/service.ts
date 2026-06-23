import { db as prisma } from '@/lib/db'
import { sanitizeForStorage } from '@/lib/sanitize'

export class ServiceError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
    this.name = 'ServiceError'
  }
}

export async function getUsers(params: { search?: string; role?: string; page: number; limit: number }) {
  const { search = '', role = '', page, limit } = params
  const skip = (page - 1) * limit

  const where: Record<string, any> = {}
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
    ]
  }
  if (role) {
    where.role = role
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
        address: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            orders: true,
            reviews: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ])

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export async function updateUser(
  adminId: string,
  userId: string,
  data: { role?: 'BUYER' | 'SELLER' | 'SHIPPER' | 'ADMIN'; isActive?: boolean; name?: string; phone?: string; address?: string }
) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    throw new ServiceError(404, 'Không tìm thấy người dùng')
  }

  // Prevent self-demotion: admin cannot change their own role
  if (data.role && userId === adminId) {
    throw new ServiceError(400, 'Không thể thay đổi vai trò của chính mình')
  }

  // Prevent deactivating yourself
  if (data.isActive === false && userId === adminId) {
    throw new ServiceError(400, 'Không thể khóa tài khoản của chính mình')
  }

  // Prevent demoting the last admin
  if (data.role && data.role !== 'ADMIN' && user.role === 'ADMIN') {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN', isActive: true } })
    if (adminCount <= 1) {
      throw new ServiceError(400, 'Không thể thay đổi vai trò của admin cuối cùng')
    }
  }

  return prisma.$transaction(async (tx) => {
    // If changing to SELLER, ensure they don't already have a shop
    if (data.role === 'SELLER' && user.role !== 'SELLER') {
      const existingShop = await tx.shop.findUnique({ where: { ownerId: userId } })
      if (!existingShop) {
        // Auto-create a shop for the new seller
        await tx.shop.create({
          data: {
            name: `Cửa hàng của ${user.name}`,
            address: user.address || 'Chưa cập nhật địa chỉ',
            ownerId: userId,
            phone: user.phone,
          },
        })
      }
    }

    const sanitizedData: Record<string, unknown> = {}
    if (data.role) sanitizedData.role = data.role
    if (data.isActive !== undefined) sanitizedData.isActive = data.isActive
    if (data.name) sanitizedData.name = sanitizeForStorage(data.name)
    if (data.phone !== undefined) sanitizedData.phone = data.phone
    if (data.address !== undefined) sanitizedData.address = data.address ? sanitizeForStorage(data.address) : null

    return tx.user.update({
      where: { id: userId },
      data: sanitizedData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
        address: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  })
}

export async function getStats() {
  const [
    totalUsers,
    totalShops,
    totalOrders,
    totalProducts,
    revenueResult,
    recentOrders,
    ordersByStatus,
    usersByRole,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.shop.count({ where: { isActive: true } }),
    prisma.order.count(),
    prisma.product.count({ where: { inStock: true } }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: {
        OR: [
          { status: 'DELIVERED' },
          { paymentStatus: 'PAID' },
        ],
      },
    }),
    prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        buyer: { select: { id: true, name: true } },
        shop: { select: { id: true, name: true } },
      },
    }),
    prisma.order.groupBy({
      by: ['status'],
      _count: { status: true },
    }),
    prisma.user.groupBy({
      by: ['role'],
      _count: { role: true },
    }),
  ])

  const totalRevenue = revenueResult._sum.total || 0

  return {
    stats: {
      totalUsers,
      totalShops,
      totalOrders,
      totalProducts,
      totalRevenue,
    },
    recentOrders,
    ordersByStatus: ordersByStatus.reduce(
      (acc, item) => {
        acc[item.status] = item._count.status
        return acc
      },
      {} as Record<string, number>
    ),
    usersByRole: usersByRole.reduce(
      (acc, item) => {
        acc[item.role] = item._count.role
        return acc
      },
      {} as Record<string, number>
    ),
  }
}
