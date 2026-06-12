import path from 'path'

// Allowed image extensions (no SVG - can contain JavaScript for XSS)
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif']

// Allowed MIME types mapped to extensions
const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
}

// Magic bytes (file signatures) for image validation
const IMAGE_SIGNATURES: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header (first 4 bytes; next 4 are file size; then WEBP)
  'image/gif': [[0x47, 0x49, 0x46, 0x38]], // GIF8
}

const MAX_FILENAME_LENGTH = 255
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export interface UploadValidationResult {
  valid: boolean
  error?: string
  sanitizedExt?: string
}

/**
 * Validate an uploaded file for security:
 * 1. Check MIME type against whitelist
 * 2. Check file extension against whitelist
 * 3. Validate MIME type matches extension
 * 4. Validate file magic bytes (actual content type)
 * 5. Validate file size
 * 6. Sanitize filename (prevent path traversal)
 */
export function validateImageUpload(file: File): UploadValidationResult {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'Kích thước file không được vượt quá 5MB' }
  }

  if (file.size === 0) {
    return { valid: false, error: 'File trống' }
  }

  // Check MIME type
  const allowedMimeTypes = Object.keys(ALLOWED_MIME_TYPES)
  if (!allowedMimeTypes.includes(file.type)) {
    return { valid: false, error: 'Chỉ chấp nhận file hình ảnh (jpg, jpeg, png, webp, gif)' }
  }

  // Get and validate extension
  const ext = path.extname(file.name).toLowerCase()
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: 'Định dạng file không được hỗ trợ' }
  }

  // Check extension matches MIME type
  const validExtensionsForMime = ALLOWED_MIME_TYPES[file.type]
  if (validExtensionsForMime && !validExtensionsForMime.includes(ext)) {
    return { valid: false, error: 'Định dạng file không khớp với loại file' }
  }

  // Sanitize filename - prevent path traversal
  const basename = path.basename(file.name)
  if (basename.length > MAX_FILENAME_LENGTH) {
    return { valid: false, error: 'Tên file quá dài' }
  }

  // Check for path traversal characters in the original filename
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    return { valid: false, error: 'Tên file không hợp lệ' }
  }

  return { valid: true, sanitizedExt: ext }
}

/**
 * Validate file magic bytes to ensure the file content matches the claimed type.
 * This should be called after reading the file buffer.
 */
export function validateFileMagicBytes(buffer: Buffer, claimedMimeType: string): boolean {
  const signatures = IMAGE_SIGNATURES[claimedMimeType]
  if (!signatures) return false

  for (const signature of signatures) {
    if (buffer.length < signature.length) continue

    let match = true
    for (let i = 0; i < signature.length; i++) {
      if (buffer[i] !== signature[i]) {
        match = false
        break
      }
    }
    if (match) return true
  }

  // Special check for WEBP: RIFF....WEBP
  if (claimedMimeType === 'image/webp') {
    if (buffer.length >= 12) {
      const riffMatch = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46
      const webpMatch = buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
      if (riffMatch && webpMatch) return true
    }
  }

  return false
}
