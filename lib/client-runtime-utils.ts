export interface NormalizedClientError {
  message: string
  code?: string
  details?: string
  hint?: string
  isAbortLike: boolean
  raw: unknown
}

export function normalizeClientError(err: unknown, fallback = 'Unexpected error'): NormalizedClientError {
  if (err instanceof Error) {
    const maybeCode = (err as any).code
    const isAbortLike =
      err.name === 'AbortError' ||
      err.name === 'TimeoutError' ||
      err.message.includes('AbortError') ||
      err.message.toLowerCase().includes('timeout')

    return {
      message: err.message || fallback,
      code: typeof maybeCode === 'string' ? maybeCode : undefined,
      isAbortLike,
      raw: err,
    }
  }

  if (typeof err === 'string') {
    return {
      message: err,
      isAbortLike: err.includes('AbortError') || err.toLowerCase().includes('timeout'),
      raw: err,
    }
  }

  if (err && typeof err === 'object') {
    const obj = err as Record<string, unknown>
    const message = typeof obj.message === 'string' ? obj.message : fallback
    const code = typeof obj.code === 'string' ? obj.code : undefined
    const details = typeof obj.details === 'string' ? obj.details : undefined
    const hint = typeof obj.hint === 'string' ? obj.hint : undefined
    const isAbortLike =
      message.includes('AbortError') ||
      message.toLowerCase().includes('timeout') ||
      code === '20' ||
      code === '23'

    return { message, code, details, hint, isAbortLike, raw: err }
  }

  return { message: fallback, isAbortLike: false, raw: err }
}

export function logClientTiming(scope: string, startMs: number, extra?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== 'development') return

  const durationMs = Date.now() - startMs
  if (extra) {
    console.debug(`[PERF] ${scope} ${durationMs}ms`, extra)
    return
  }

  console.debug(`[PERF] ${scope} ${durationMs}ms`)
}
