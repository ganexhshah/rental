/**
 * Cloudflare R2 Object Storage Client for Vehicle Rental SaaS
 * S3-compatible high-performance object storage for vehicles, documents, contracts, and receipts.
 */

export interface R2Config {
  accountId: string
  bucketName: string
  accessKeyId: string
  secretAccessKey: string
  publicUrl: string
  customDomain?: string
}

export const DEFAULT_R2_CONFIG: R2Config = {
  accountId: '516d4d7c8a274b7f897979999bcb096b',
  bucketName: 'protofilo',
  accessKeyId: '80077dcf329a6b01c33e2c44b2b31e9b',
  secretAccessKey: '506cbfc47728c0c24cb2756620e9936fcddd35f0ed9c633102454c6ddb86f2b4',
  publicUrl: import.meta.env.VITE_R2_PUBLIC_URL || 'https://pub-1ccd4de4be1c4425b05bfbbde47ef4e5.r2.dev',
  customDomain: import.meta.env.VITE_R2_CUSTOM_DOMAIN || 'ganeshshah.com',
}

export interface UploadResult {
  key: string
  url: string
  bucket: string
  size: number
  contentType: string
}

// Convert string to Uint8Array
function strToUint8(str: string): Uint8Array {
  return new TextEncoder().encode(str)
}

// SHA-256 hash using Web Crypto API
async function sha256Hex(data: ArrayBuffer | Uint8Array | string): Promise<string> {
  const buf = typeof data === 'string' ? strToUint8(data) : data
  const hashBuffer = await crypto.subtle.digest('SHA-256', buf as unknown as BufferSource)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// HMAC-SHA256 using Web Crypto API
async function hmacSha256(key: Uint8Array | ArrayBuffer, data: string | Uint8Array): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key as unknown as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const d = typeof data === 'string' ? strToUint8(data) : data
  return await crypto.subtle.sign('HMAC', cryptoKey, d as unknown as BufferSource)
}

// Derive AWS SigV4 signing key
async function getSigningKey(secretKey: string, dateStamp: string, region: string, service: string): Promise<ArrayBuffer> {
  const kDate = await hmacSha256(strToUint8('AWS4' + secretKey), dateStamp)
  const kRegion = await hmacSha256(kDate, region)
  const kService = await hmacSha256(kRegion, service)
  return await hmacSha256(kService, 'aws4_request')
}

/**
 * Check if a given URL is hosted on the cloud
 */
export function isCloudUrl(url?: string): boolean {
  if (!url) return false
  return (
    url.startsWith('https://') ||
    url.startsWith('http://')
  ) && !url.startsWith('blob:') && !url.startsWith('data:')
}

/**
 * Upload file directly to Cloudflare R2 bucket with server fallback
 */
export async function uploadToR2(
  file: File | Blob,
  key: string,
  contentType?: string,
  config: R2Config = DEFAULT_R2_CONFIG
): Promise<UploadResult> {
  const mimeType = contentType || (file instanceof File ? file.type : 'application/octet-stream') || 'application/octet-stream'
  const fileBuffer = await file.arrayBuffer()
  const contentHash = await sha256Hex(fileBuffer)

  const region = 'auto'
  const service = 's3'
  const host = `${config.accountId}.r2.cloudflarestorage.com`
  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.substring(0, 8)

  const canonicalUri = `/${config.bucketName}/${key}`
  const canonicalHeaders = `content-type:${mimeType}\nhost:${host}\nx-amz-content-sha256:${contentHash}\nx-amz-date:${amzDate}\n`
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date'

  const canonicalRequest = ['PUT', canonicalUri, '', canonicalHeaders, signedHeaders, contentHash].join('\n')
  const canonicalRequestHash = await sha256Hex(canonicalRequest)

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, canonicalRequestHash].join('\n')

  const signingKey = await getSigningKey(config.secretAccessKey, dateStamp, region, service)
  const signatureBuffer = await hmacSha256(signingKey, stringToSign)
  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  const authHeader = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  const targetUrl = `https://${host}${canonicalUri}`

  // Step 1: Attempt direct high-speed client-to-R2 upload (CORS is active on bucket)
  try {
    const res = await fetch(targetUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': mimeType,
        'x-amz-date': amzDate,
        'x-amz-content-sha256': contentHash,
        Authorization: authHeader,
      },
      body: fileBuffer,
    })

    if (res.ok) {
      const publicCdnUrl = `${config.publicUrl.replace(/\/$/, '')}/${key}`
      return {
        key,
        url: publicCdnUrl,
        bucket: config.bucketName,
        size: file.size,
        contentType: mimeType,
      }
    } else {
      const errText = await res.text()
      console.warn(`Direct R2 upload responded with ${res.status}: ${errText}. Attempting server fallback...`)
    }
  } catch (err) {
    console.warn('Direct R2 upload encountered network/client restriction, attempting server fallback:', err)
  }

  // Step 2: Reliable server-side upload fallback to Cloudflare R2
  try {
    const serverRes = await fetch('/api/upload-to-r2', {
      method: 'POST',
      headers: {
        'Content-Type': mimeType,
        'x-r2-key': key,
      },
      body: fileBuffer,
    })

    if (serverRes.ok) {
      const json = await serverRes.json()
      if (json.url) {
        return {
          key: json.key || key,
          url: json.url,
          bucket: json.bucket || config.bucketName,
          size: json.size || file.size,
          contentType: mimeType,
        }
      }
    } else {
      const serverErr = await serverRes.text()
      console.error('Server upload fallback failed:', serverRes.status, serverErr)
    }
  } catch (serverErr) {
    console.error('Server upload fallback network error:', serverErr)
  }

  // If both failed, do not silently store broken data; throw an informative error
  throw new Error(`Failed to upload file. Please check your network connection.`)
}

/**
 * Convenience helper to upload vehicle photos
 */
export async function uploadVehiclePhoto(file: File, vehicleId: string): Promise<UploadResult> {
  const ext = file.name.split('.').pop() || 'jpg'
  const key = `vehicles/${vehicleId}/photos/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`
  return uploadToR2(file, key)
}

/**
 * Convenience helper to upload customer identity documents
 */
export async function uploadCustomerDocument(file: File, customerId: string, docType: string): Promise<UploadResult> {
  const ext = file.name.split('.').pop() || 'pdf'
  const key = `customers/${customerId}/documents/${docType}-${Date.now()}.${ext}`
  return uploadToR2(file, key)
}

/**
 * Convenience helper to upload rental damage photos
 */
export async function uploadDamagePhoto(file: File, bookingId: string): Promise<UploadResult> {
  const ext = file.name.split('.').pop() || 'jpg'
  const key = `bookings/${bookingId}/damage/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`
  return uploadToR2(file, key)
}

/**
 * Convenience helper to upload expense receipts
 */
export async function uploadReceipt(file: File, expenseId: string): Promise<UploadResult> {
  const ext = file.name.split('.').pop() || 'pdf'
  const key = `expenses/${expenseId}/receipts/${Date.now()}.${ext}`
  return uploadToR2(file, key)
}
