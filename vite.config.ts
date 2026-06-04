import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import https from 'https'
import type { IncomingMessage, ServerResponse } from 'http'

export default defineConfig(({ mode }) => {
  const env    = loadEnv(mode, process.cwd(), '')
  const apiKey = env.ANTHROPIC_API_KEY || ''

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'anthropic-proxy',
        configureServer(server) {
          server.middlewares.use('/api/anthropic', (req: IncomingMessage, res: ServerResponse) => {
            let body = ''
            req.on('data', (chunk: Buffer) => { body += chunk.toString() })
            req.on('end', () => {
              const bodyBuffer = Buffer.from(body)
              const options = {
                hostname: 'api.anthropic.com',
                port: 443,
                path: '/v1/messages',
                method: 'POST',
                headers: {
                  'Content-Type':      'application/json',
                  'anthropic-version': '2023-06-01',
                  'x-api-key':         apiKey,
                  'Content-Length':    bodyBuffer.byteLength,
                },
              }

              const proxyReq = https.request(options, (proxyRes) => {
                res.writeHead(proxyRes.statusCode ?? 500, {
                  'Content-Type': 'application/json',
                })
                proxyRes.pipe(res)
              })

              proxyReq.on('error', (err) => {
                res.writeHead(500)
                res.end(JSON.stringify({ error: err.message }))
              })

              proxyReq.write(bodyBuffer)
              proxyReq.end()
            })
          })
        },
      },
    ],
    base: './',
  }
})
