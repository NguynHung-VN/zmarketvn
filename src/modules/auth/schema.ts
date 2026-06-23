import { z } from 'zod/v4'

export const loginSchema = z.object({
  email: z.string().min(1, 'Vui lòng nhập email'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
})

export const registerSchema = z.object({
  name: z.string().min(2, 'Tên phải có ít nhất 2 ký tự').max(100, 'Tên quá dài'),
  email: z.string().email('Email không hợp lệ').max(200, 'Email quá dài'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự').max(128, 'Mật khẩu quá dài'),
  phone: z.string().max(20, 'Số điện thoại quá dài').optional().nullable(),
  address: z.string().max(500, 'Địa chỉ quá dài').optional().nullable(),
})
