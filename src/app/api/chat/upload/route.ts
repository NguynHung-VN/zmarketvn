import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { validateImageUpload } from '@/lib/upload-security'
import { uploadToCloudinary } from '@/lib/cloudinary'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Không tìm thấy file hình ảnh' }, { status: 400 })
    }

    // Validate file
    const validation = validateImageUpload(file)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || 'File không hợp lệ' }, { status: 400 })
    }

    // Convert to Buffer for Cloudinary helper
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload to Cloudinary under zmarket/chat
    const url = await uploadToCloudinary(buffer, 'zmarket/chat')

    return NextResponse.json({ url, message: 'Tải hình ảnh lên thành công' })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Lỗi tải hình ảnh lên' }, { status: 500 })
  }
}
