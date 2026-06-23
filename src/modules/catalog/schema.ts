import { z } from 'zod/v4'

export const createProductSchema = z.object({
  name: z.string().min(2, 'Tên sản phẩm phải có ít nhất 2 ký tự').max(200, 'Tên sản phẩm quá dài'),
  description: z.string().max(5000, 'Mô tả quá dài').optional(),
  longDescription: z.string().optional(),
  price: z.number().positive('Giá phải lớn hơn 0').max(1000000000, 'Giá quá lớn'),
  originalPrice: z.number().positive().max(1000000000, 'Giá gốc quá lớn').optional(),
  image: z.string().max(2000, 'URL hình ảnh quá dài').optional(),
  images: z.array(z.string()).optional(),
  unit: z.string().max(50, 'Đơn vị quá dài').default('kg'),
  inStock: z.boolean().default(true),
  categoryId: z.string().min(1, 'Vui lòng chọn danh mục'),
  stockQuantity: z.number().int().nonnegative('Tồn kho không được âm').default(0),
  lowStockThreshold: z.number().int().nonnegative('Ngưỡng cảnh báo không được âm').default(5),
  sku: z.string().max(100, 'SKU quá dài').optional().nullable(),
  weightGram: z.number().int().positive('Trọng lượng phải lớn hơn 0').optional().nullable(),
  origin: z.string().max(100, 'Xuất xứ quá dài').optional().nullable(),
  storageInfo: z.string().max(200, 'Thông tin bảo quản quá dài').optional().nullable(),
  variants: z.array(z.object({
    name: z.string().min(1),
    price: z.number().positive(),
    stockQuantity: z.number().int().nonnegative(),
    sku: z.string().optional()
  })).optional(),
})

export const updateProductSchema = z.object({
  name: z.string().min(2, 'Tên sản phẩm phải có ít nhất 2 ký tự').max(200, 'Tên sản phẩm quá dài').optional(),
  description: z.string().max(5000, 'Mô tả quá dài').optional(),
  longDescription: z.string().optional(),
  price: z.number().positive('Giá phải lớn hơn 0').max(1000000000, 'Giá quá lớn').optional(),
  originalPrice: z.number().positive().max(1000000000, 'Giá gốc quá lớn').optional().nullable(),
  image: z.string().max(2000, 'URL hình ảnh quá dài').optional().nullable(),
  images: z.array(z.string()).optional(),
  unit: z.string().max(50, 'Đơn vị quá dài').optional(),
  inStock: z.boolean().optional(),
  categoryId: z.string().optional(),
  stockQuantity: z.number().int().nonnegative('Tồn kho không được âm').optional(),
  lowStockThreshold: z.number().int().nonnegative('Ngưỡng cảnh báo không được âm').optional(),
  sku: z.string().max(100, 'SKU quá dài').optional().nullable(),
  weightGram: z.number().int().positive('Trọng lượng phải lớn hơn 0').optional().nullable(),
  origin: z.string().max(100, 'Xuất xứ quá dài').optional().nullable(),
  storageInfo: z.string().max(200, 'Thông tin bảo quản quá dài').optional().nullable(),
  isActive: z.boolean().optional(),
  variants: z.array(z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    price: z.number().positive(),
    stockQuantity: z.number().int().nonnegative(),
    sku: z.string().optional()
  })).optional(),
})
