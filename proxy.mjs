// Simple local proxy — forwards requests to Anthropic API with your key injected.
import https from 'https'
import http from 'http'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Read .env file manually
const __dirname = dirname(fileURLToPath(import.meta.url))
let API_KEY = ''
try {
  const envFile = readFileSync(join(__dirname, '.env'), 'utf-8')
  const match   = envFile.match(/^ANTHROPIC_API_KEY=(.+)$/m)
  if (match) API_KEY = match[1].trim()
} catch {
  // fall through to error below
}

if (!API_KEY || API_KEY === 'paste-your-key-here') {
  console.error('ERROR: ANTHROPIC_API_KEY not found in .env file')
  process.exit(1)
}

const server = http.createServer((req, res) => {
  // Allow requests from the Vite dev server
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  let body = ''
  req.on('data', (chunk) => { body += chunk })
  req.on('end', () => {
    const buf = Buffer.from(body)
    console.log('--- Outgoing to Anthropic ---')
    console.log('Body:', body.slice(0, 300))
    const proxyReq = https.request({
      hostname: 'api.anthropic.com',
      port: 443,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length':    buf.byteLength,
      },
    }, (proxyRes) => {
      let respBody = ''
      proxyRes.on('data', (chunk) => { respBody += chunk })
      proxyRes.on('end', () => {
        console.log('--- Response from Anthropic ---')
        console.log('Status:', proxyRes.statusCode)
        console.log('Body:', respBody.slice(0, 500))
        res.writeHead(proxyRes.statusCode ?? 500, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'http://localhost:5173',
        })
        res.end(respBody)
      })
    })

    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err.message)
      res.writeHead(500)
      res.end(JSON.stringify({ error: err.message }))
    })

    proxyReq.write(buf)
    proxyReq.end()
  })
})

server.listen(3001, () => {
  console.log('✅ Anthropic proxy running on http://localhost:3001')
  console.log('   API key loaded:', API_KEY.slice(0, 16) + '...')
})
