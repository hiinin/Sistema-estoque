/**
 * Cabeçalhos de segurança + proteção CSRF (verificação de Origin em métodos mutáveis).
 */
export default defineEventHandler((event) => {
  setResponseHeaders(event, {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    ...(process.env.NODE_ENV === 'production'
      ? { 'Strict-Transport-Security': 'max-age=63072000; includeSubDomains' }
      : {})
  })

  const method = event.method
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return
  if (!event.path.startsWith('/api/')) return

  const origin = getRequestHeader(event, 'origin')
  if (!origin) return // requisições sem Origin (não-browser) não carregam cookie de outro site

  const host = getRequestHost(event, { xForwardedHost: true })
  let originHost = ''
  try {
    originHost = new URL(origin).host
  } catch {
    // origem inválida
  }

  if (originHost !== host) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Origem não permitida',
      message: 'Requisição bloqueada por verificação de origem (CSRF).'
    })
  }
})
