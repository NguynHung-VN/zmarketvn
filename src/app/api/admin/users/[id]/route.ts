import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { sanitizeForStorage } from '@/lib/sanitize'
import { rateLimiters } from '@/lib/rate-limit'
import { z } from 'zod/v4'

const updateUserSchema = z.object({
  role: z.enum(['BUYER', 'SELLER', 'SHIPPER', 'ADMIN']).optional(),
  isActive: z.boolean().optional(),
  name: z.string().max(100, 'Tên quá dài').optional(),
  phone: z.string().max(20, 'Số điện thoại quá dài').optional(),
  address: z.string().max(500, 'Địa chỉ quá dài').optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting check
    const rateLimitResponse = rateLimiters.adminUserUpdate(request)
    if (rateLimitResponse) return rateLimitResponse

    const adminUser = await requireRole('ADMIN')
    const { id } = await params
    const body = await request.json()
    const data = updateUserSchema.parse(body)

    const user = await db.user.findUnique({ where: { id } })
    if (!user) {
      return NextResponse.json(
        { error: 'Không tìm thấy người dùng' },
        { status: 404 }
      )
    }

    // Prevent self-demotion: admin cannot change their own role
    if (data.role && id === adminUser.id) {
      return NextResponse.json(
        { error: 'Không thể thay đổi vai trò của chính mình' },
        { status: 400 }
      )
    }

    // Prevent deactivating yourself
    if (data.isActive === false && id === adminUser.id) {
      return NextResponse.json(
        { error: 'Không thể khóa tài khoản của chính mình' },
        { status: 400 }
      )
    }

    // Prevent demoting the last admin
    if (data.role && data.role !== 'ADMIN' && user.role === 'ADMIN') {
      const adminCount = await db.user.count({ where: { role: 'ADMIN', isActive: true } })
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Không thể thay đổi vai trò của admin cuối cùng' },
          { status: 400 }
        )
      }
    }

    // If changing to SELLER, ensure they don't already have a shop
    if (data.role === 'SELLER' && user.role !== 'SELLER') {
      const existingShop = await db.shop.findUnique({ where: { ownerId: id } })
      if (!existingShop) {
        // Auto-create a shop for the new seller
        await db.shop.create({
          data: {
            name: `Cửa hàng của ${user.name}`,
            address: user.address || 'Chưa cập nhật địa chỉ',
            ownerId: id,
            phone: user.phone,
          },
        })
      }
    }

    // Sanitize text inputs
    const sanitizedData: Record<string, unknown> = {}
    if (data.role) sanitizedData.role = data.role
    if (data.isActive !== undefined) sanitizedData.isActive = data.isActive
    if (data.name) sanitizedData.name = sanitizeForStorage(data.name)
    if (data.phone !== undefined) sanitizedData.phone = data.phone
    if (data.address !== undefined) sanitizedData.address = data.address ? sanitizeForStorage(data.address) : null

    const updated = await db.user.update({
      where: { id },
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

    return NextResponse.json({ user: updated, message: 'Đã cập nhật người dùng' })
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json(
        { error: error.message === 'Unauthorized' ? 'Chưa đăng nhập' : 'Không có quyền truy cập' },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      )
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
