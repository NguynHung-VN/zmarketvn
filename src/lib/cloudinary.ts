import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary - works both locally and on Vercel
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

export { cloudinary }

/**
 * Upload an image buffer to Cloudinary
 * @param buffer - The image buffer to upload
 * @param folder - Cloudinary folder (e.g., 'zmarket/products', 'zmarket/chat')
 * @param filename - Optional public_id for the image
 * @returns The secure URL of the uploaded image
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  folder: string = 'zmarket',
  filename?: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadOptions: cloudinary.UploadUploadOptions = {
      folder,
      resource_type: 'image',
      transformation: [
        { quality: 'auto', fetch_format: 'auto' },
      ],
    }

    if (filename) {
      uploadOptions.public_id = filename
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(new Error(`Cloudinary upload failed: ${error.message}`))
        } else if (result) {
          resolve(result.secure_url)
        } else {
          reject(new Error('Cloudinary upload returned no result'))
        }
      }
    )

    uploadStream.end(buffer)
  })
}

/**
 * Delete an image from Cloudinary by URL
 * Extracts the public_id from the URL and deletes the image
 */
export async function deleteFromCloudinary(imageUrl: string): Promise<void> {
  try {
    // Extract public_id from Cloudinary URL
    // URL format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{folder}/{filename}.{ext}
    const urlParts = imageUrl.split('/upload/')
    if (urlParts.length < 2) return

    const pathPart = urlParts[1]
    // Remove version prefix (v1234567890/) and extension
    const withoutVersion = pathPart.replace(/^v\d+\//, '')
    const publicId = withoutVersion.replace(/\.[^.]+$/, '')

    await cloudinary.uploader.destroy(publicId)
  } catch {
    // Don't throw on delete failure - log and continue
    console.error('Failed to delete image from Cloudinary')
  }
}

/**
 * Check if a URL is a Cloudinary URL
 */
export function isCloudinaryUrl(url: string): boolean {
  return url.includes('res.cloudinary.com')
}
