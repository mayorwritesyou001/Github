// ─── Rate limiting store ──────────────────────────────────────────────────────
// In-memory store — resets on cold start (fine for MVP)
// Each entry: { count: number, windowStart: number }
const rateLimitStore = new Map()

const RATE_LIMIT_MAX      = 5    // max requests
const RATE_LIMIT_WINDOW   = 60 * 60 * 1000  // per 1 hour (ms)
const MAX_BODY_SIZE_BYTES = 1 * 1024 * 1024 // 1MB max request body

// ─── Helper: get client IP ────────────────────────────────────────────────────
function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.socket?.remoteAddress || 'unknown'
}

// ─── Helper: check rate limit ─────────────────────────────────────────────────
function isRateLimited(ip) {
  const now = Date.now()
  const entry = rateLimitStore.get(ip)

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    // New window
    rateLimitStore.set(ip, { count: 1, windowStart: now })
    return false
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return true
  }

  entry.count += 1
  return false
}

// ─── Helper: clean up old entries to prevent memory leak ─────────────────────
function cleanupStore() {
  const now = Date.now()
  for (const [ip, entry] of rateLimitStore.entries()) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW) {
      rateLimitStore.delete(ip)
    }
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {

  // ── Only allow POST ──
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // ── Security headers ──
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')

  // ── Rate limiting ──
  const clientIP = getClientIP(req)
  cleanupStore() // clean old entries on each request

  if (isRateLimited(clientIP)) {
    return res.status(429).json({
      error: 'Too many requests. Please wait an hour before trying again.',
      retryAfter: '3600'
    })
  }

  // ── API key check ──
  if (!process.env.VITE_ANTHROPIC_API_KEY) {
    console.error('VITE_ANTHROPIC_API_KEY is not set')
    return res.status(500).json({ error: 'Server configuration error' })
  }

  // ── Body size check ──
  const contentLength = parseInt(req.headers['content-length'] || '0')
  if (contentLength > MAX_BODY_SIZE_BYTES) {
    return res.status(413).json({
      error: 'Request too large. Please export only the last 4 weeks of data.'
    })
  }

  // ── Validate request body ──
  const body = req.body
  if (!body || !body.messages || !Array.isArray(body.messages)) {
    return res.status(400).json({ error: 'Invalid request format' })
  }

  // ── Check message content is not empty ──
  const userMessage = body.messages.find(m => m.role === 'user')
  if (!userMessage || !userMessage.content || userMessage.content.length < 10) {
    return res.status(400).json({ error: 'No data provided for analysis' })
  }

  // ── Forward to Anthropic ──
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.VITE_ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      body.model      || 'claude-sonnet-4-20250514',
        max_tokens: body.max_tokens || 1500,
        system:     body.system     || '',
        messages:   body.messages,
      }),
    })

    // ── Handle Anthropic errors ──
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      console.error('Anthropic API error:', response.status, errData)

      if (response.status === 401) {
        return res.status(500).json({ error: 'Server configuration error' })
      }
      if (response.status === 429) {
        return res.status(429).json({ error: 'Service busy. Please try again in a moment.' })
      }
      if (response.status === 529) {
        return res.status(503).json({ error: 'Service temporarily unavailable. Please try again.' })
      }

      return res.status(response.status).json({
        error: 'Analysis failed. Please try again.'
      })
    }

    const data = await response.json()

    // ── Strip any accidental internal details before returning ──
    if (data.error) {
      console.error('Anthropic returned error in body:', data.error)
      return res.status(500).json({ error: 'Analysis failed. Please try again.' })
    }

    return res.status(200).json(data)

  } catch (error) {
    console.error('Handler error:', error.message)
    return res.status(500).json({
      error: 'Something went wrong. Please try again.'
    })
  }
}
