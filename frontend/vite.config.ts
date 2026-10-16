import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import crypto from 'node:crypto'

// Cloudflare R2 Object Storage Config
const R2_CONFIG = {
  accountId: '516d4d7c8a274b7f897979999bcb096b',
  bucketName: 'protofilo',
  accessKeyId: '80077dcf329a6b01c33e2c44b2b31e9b',
  secretAccessKey: '506cbfc47728c0c24cb2756620e9936fcddd35f0ed9c633102454c6ddb86f2b4',
  publicUrl: 'https://pub-1ccd4de4be1c4425b05bfbbde47ef4e5.r2.dev',
}

function r2ServerUploadPlugin(): Plugin {
  return {
    name: 'r2-server-upload-middleware',
    configureServer(server) {
      server.middlewares.use('/api/upload-to-r2', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Method Not Allowed' }))
          return
        }

        try {
          const key = (req.headers['x-r2-key'] as string) || `uploads/${Date.now()}.bin`
          const mimeType = (req.headers['content-type'] as string) || 'application/octet-stream'

          const chunks: Buffer[] = []
          for await (const chunk of req) {
            chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
          }
          const fileBuffer = Buffer.concat(chunks)

          // SigV4 Upload to Cloudflare R2
          const contentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex')
          const region = 'auto'
          const service = 's3'
          const host = `${R2_CONFIG.accountId}.r2.cloudflarestorage.com`
          const now = new Date()
          const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
          const dateStamp = amzDate.substring(0, 8)

          const canonicalUri = `/${R2_CONFIG.bucketName}/${key}`
          const canonicalHeaders = `content-type:${mimeType}\nhost:${host}\nx-amz-content-sha256:${contentHash}\nx-amz-date:${amzDate}\n`
          const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date'

          const canonicalRequest = ['PUT', canonicalUri, '', canonicalHeaders, signedHeaders, contentHash].join('\n')
          const canonicalRequestHash = crypto.createHash('sha256').update(canonicalRequest).digest('hex')

          const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
          const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, canonicalRequestHash].join('\n')

          const kDate = crypto.createHmac('sha256', 'AWS4' + R2_CONFIG.secretAccessKey).update(dateStamp).digest()
          const kRegion = crypto.createHmac('sha256', kDate).update(region).digest()
          const kService = crypto.createHmac('sha256', kRegion).update(service).digest()
          const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest()
          const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex')

          const authHeader = `AWS4-HMAC-SHA256 Credential=${R2_CONFIG.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
          const targetUrl = `https://${host}${canonicalUri}`

          const r2Res = await fetch(targetUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': mimeType,
              'x-amz-date': amzDate,
              'x-amz-content-sha256': contentHash,
              Authorization: authHeader,
            },
            body: fileBuffer,
          })

          if (!r2Res.ok) {
            const errText = await r2Res.text()
            res.statusCode = r2Res.status
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: `R2 upload failed: ${errText}` }))
            return
          }

          const publicUrl = `${R2_CONFIG.publicUrl.replace(/\/$/, '')}/${key}`
          res.setHeader('Content-Type', 'application/json')
          res.statusCode = 200
          res.end(
            JSON.stringify({
              key,
              url: publicUrl,
              bucket: R2_CONFIG.bucketName,
              size: fileBuffer.length,
              contentType: mimeType,
            })
          )
        } catch (err: any) {
          console.error('[r2ServerUploadPlugin] Upload error:', err)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: err?.message || 'Upload server error' }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), r2ServerUploadPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'react': fileURLToPath(new URL('./node_modules/react', import.meta.url)),
      'react-dom': fileURLToPath(new URL('./node_modules/react-dom', import.meta.url)),
    },
    dedupe: ['react', 'react-dom', 'zustand', 'react-router-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client', 'zustand', 'react-router-dom', 'antd'],
  },
  server: {
    port: 3000,
    open: false,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
