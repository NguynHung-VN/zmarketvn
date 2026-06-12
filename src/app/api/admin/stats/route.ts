import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'

export async function GET() {
  try {
    const user = await requireRole('ADMIN')

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
      db.user.count(),
      db.shop.count({ where: { isActive: true } }),
      db.order.count(),
      db.product.count({ where: { inStock: true } }),
      db.order.aggregate({
        _sum: { total: true },
        where: { status: 'DELIVERED' },
      }),
      db.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          buyer: { select: { id: true, name: true } },
          shop: { select: { id: true, name: true } },
        },
      }),
      db.order.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      db.user.groupBy({
        by: ['role'],
        _count: { role: true },
      }),
    ])

    const totalRevenue = revenueResult._sum.total || 0

    return NextResponse.json({
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
    })
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json(
        { error: error.message === 'Unauthorized' ? 'Chưa đăng nhập' : 'Không có quyền truy cập' },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      )
    }
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
