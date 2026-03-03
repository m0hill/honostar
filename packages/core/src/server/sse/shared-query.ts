export class SharedQueryCoalescer {
  private inflight = new Map<string, Promise<string[]>>()
  private cache = new Map<string, { expiresAt: number; compiled: string[] }>()

  async getOrRun(key: string, cacheMs: number, fn: () => Promise<string[]>): Promise<string[]> {
    const now = Date.now()
    const cached = this.cache.get(key)
    if (cached && cached.expiresAt > now) {
      return [...cached.compiled]
    }

    if (cached && cached.expiresAt <= now) {
      this.cache.delete(key)
    }

    const active = this.inflight.get(key)
    if (active) return active

    const promise = (async () => {
      const compiled = await fn()
      const ttl = Math.max(0, cacheMs)
      this.cache.set(key, { expiresAt: Date.now() + ttl, compiled: [...compiled] })
      return [...compiled]
    })()

    this.inflight.set(key, promise)

    try {
      return await promise
    } finally {
      this.inflight.delete(key)
    }
  }
}

export const sharedQueryCoalescer = new SharedQueryCoalescer()
