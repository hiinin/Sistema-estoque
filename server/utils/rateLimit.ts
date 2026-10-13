interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

/**
 * Limitador de tentativas em memória (por instância).
 * Lança 429 quando excede `max` tentativas em `windowMs`.
 */
export function checkRateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now()

  // Limpeza oportunista para não crescer indefinidamente
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k)
  }

  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return
  }

  bucket.count++
  if (bucket.count > max) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000)
    throw createError({
      statusCode: 429,
      statusMessage: 'Muitas tentativas',
      message: `Muitas tentativas. Tente novamente em ${Math.ceil(retryAfter / 60)} minuto(s).`,
      data: { retryAfter }
    })
  }
}

export function resetRateLimit(key: string) {
  buckets.delete(key)
}
