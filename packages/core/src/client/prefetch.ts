/**
 * Client Prefetch
 *
 * Implements lightweight link prefetching for MPAs:
 * - Adds prefetch hints (via `<link rel="prefetch">`) or uses `fetch()` depending on policy.
 * - Uses conservative defaults: respects Data Saver, throttles on slow connections, same-origin only.
 * - Uses intent signals (hover/intent/visibility) to avoid wasteful prefetching.
 *
 * Architecture Notes:
 * - The cache is time-based (`ttlMs`) and bounded (`maxEntries`) to avoid unbounded growth.
 * - We keep behavior "best-effort": failures are cached briefly to avoid tight retry loops.
 */
type PrefetchStrategy = "none" | "hover" | "intent" | "visible" | "immediate" | "tap"
type PrefetchDisable = "off"

type PrefetchMethod = "link" | "fetch"
type PrefetchTarget = "document" | "script" | "style" | "image" | "font" | "fetch"
type PrefetchPriority = "high" | "low" | "auto"

const PREFETCH_DISABLE_VALUE: PrefetchDisable = "off"

export interface PrefetchOptions {
  /**
   * Override the prefetch transport for a single request.
   *
   * - `"link"` uses `<link rel="prefetch">` (cheap hint; browser decides).
   * - `"fetch"` issues a fetch immediately (more eager, heavier).
   */
  method?: PrefetchMethod
  /**
   * Resource type hint (`as=`) when using `<link rel="prefetch">`.
   */
  kind?: PrefetchTarget
  /**
   * Importance hint for the browser (`importance=`).
   */
  priority?: PrefetchPriority
  /**
   * Cache time-to-live for this URL.
   */
  ttlMs?: number
  signal?: AbortSignal
  allowCrossOrigin?: boolean
  crossOrigin?: "anonymous" | "use-credentials"
}

export interface PrefetchPolicy {
  /**
   * Global enable/disable switch.
   */
  enabled: boolean
  /**
   * If true, only prefetch same-origin URLs (recommended default).
   */
  onlySameOrigin: boolean
  /**
   * If true, do not prefetch when the user has Data Saver enabled.
   */
  respectDataSaver: boolean
  /**
   * If true, do not prefetch on slow connections (`2g` / `slow-2g`).
   */
  respectSlowConnections: boolean
  defaultStrategy: PrefetchStrategy
  attachAllAnchors: boolean
  hoverDelayMs: number
  intentDelayMs: number
  visibleRootMargin: string
  maxEntries: number
  defaultTTLms: number
  useLinkRel: boolean
  watchMutations: boolean
}

type EntryState = "pending" | "done" | "error"

type CacheEntry = {
  url: string
  expiresAt: number
  state: EntryState
  method: PrefetchMethod
  abort?: AbortController
  promise?: Promise<void>
}

function isSameOrigin(url: URL): boolean {
  return url.origin === location.origin
}

function shouldThrottleByNetwork(policy: PrefetchPolicy): boolean {
  const conn = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string }
    }
  ).connection
  const saveData = Boolean(conn && conn.saveData)
  const slow = Boolean(conn && (conn.effectiveType === "2g" || conn.effectiveType === "slow-2g"))
  if (policy.respectDataSaver && saveData) return true
  if (policy.respectSlowConnections && slow) return true
  return false
}

function absUrl(href: string): URL | null {
  try {
    return new URL(href, location.href)
  } catch {
    return null
  }
}

type IdleCapableWindow = Window &
  Partial<{
    requestIdleCallback: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number
  }>

function onIdle(cb: () => void) {
  const win = window as IdleCapableWindow
  if (typeof win.requestIdleCallback === "function") {
    win.requestIdleCallback(() => cb(), { timeout: 1000 })
    return
  }
  setTimeout(cb, 0)
}

function parsePrefetchStrategy(value: string | null): PrefetchStrategy | null {
  switch (value) {
    case "none":
    case "hover":
    case "intent":
    case "visible":
    case "immediate":
    case "tap":
      return value
    default:
      return null
  }
}

function parsePrefetchMethod(value: string | null): PrefetchMethod | undefined {
  return value === "link" || value === "fetch" ? value : undefined
}

function parsePrefetchPriority(value: string | null): PrefetchPriority | undefined {
  return value === "high" || value === "low" || value === "auto" ? value : undefined
}

function parsePrefetchTarget(value: string | null): PrefetchTarget | undefined {
  switch (value) {
    case "document":
    case "script":
    case "style":
    case "image":
    case "font":
    case "fetch":
      return value
    default:
      return undefined
  }
}

export class PrefetchClient {
  private policy: PrefetchPolicy
  private cache = new Map<string, CacheEntry>()
  private seen = new WeakSet<HTMLAnchorElement>()
  private linkObserver: IntersectionObserver | null = null
  private mutationObserver: MutationObserver | null = null
  private cleanupFns: Array<() => void> = []

  constructor(config?: Partial<PrefetchPolicy>) {
    this.policy = {
      enabled: true,
      onlySameOrigin: true,
      respectDataSaver: true,
      respectSlowConnections: true,
      defaultStrategy: "hover",
      attachAllAnchors: true,
      hoverDelayMs: 40,
      intentDelayMs: 120,
      visibleRootMargin: "200px",
      maxEntries: 200,
      defaultTTLms: 5 * 60 * 1000,
      useLinkRel: true,
      watchMutations: true,
      ...config,
    }
  }

  /**
   * Update the global prefetch policy at runtime.
   */
  configure(config: Partial<PrefetchPolicy>) {
    this.policy = { ...this.policy, ...config }
  }

  /**
   * Returns true if the URL is cached and not expired.
   */
  isPrefetched(url: string): boolean {
    const u = absUrl(url)
    if (!u) return false
    const entry = this.cache.get(u.href)
    if (!entry) return false
    return entry.state === "done" && entry.expiresAt > Date.now()
  }

  /**
   * Evict cached entries for a specific URL or predicate.
   */
  invalidate(where: string | ((url: string) => boolean)) {
    for (const key of this.cache.keys()) {
      if (typeof where === "string") {
        if (key === absUrl(where)?.href) this.cache.delete(key)
      } else if (where(key)) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Add a `<link rel="preconnect">` hint for an origin.
   */
  preconnect(origin: string) {
    try {
      const url = new URL(origin)
      const link = document.createElement("link")
      link.rel = "preconnect"
      link.href = url.origin
      link.crossOrigin = ""
      document.head.appendChild(link)
    } catch {
      // ignore
    }
  }

  /**
   * Prefetch a URL according to policy and options.
   */
  async prefetch(href: string, opts: PrefetchOptions = {}): Promise<void> {
    if (!this.policy.enabled) return
    const u = absUrl(href)
    if (!u) return
    if (!isSameOrigin(u) && this.policy.onlySameOrigin && !opts.allowCrossOrigin) return
    if (shouldThrottleByNetwork(this.policy)) return

    if (opts.signal?.aborted) return

    const key = u.href
    const existing = this.cache.get(key)
    const ttl = opts.ttlMs ?? this.policy.defaultTTLms

    if (existing && existing.expiresAt > Date.now()) {
      return existing.promise ?? Promise.resolve()
    }

    if (this.cache.size >= this.policy.maxEntries) {
      let oldestKey: string | null = null
      let oldest = Infinity
      for (const [k, v] of this.cache) {
        if (v.expiresAt < oldest) {
          oldest = v.expiresAt
          oldestKey = k
        }
      }
      if (oldestKey) this.cache.delete(oldestKey)
    }

    const method: PrefetchMethod = opts.method ?? (this.policy.useLinkRel ? "link" : "fetch")
    const entry: CacheEntry = {
      url: key,
      expiresAt: Date.now() + ttl,
      state: "pending",
      method,
    }
    this.cache.set(key, entry)

    const done = () => {
      entry.state = "done"
      entry.expiresAt = Date.now() + ttl
    }
    const fail = () => {
      entry.state = "error"
      entry.expiresAt = Date.now() + 10_000
    }

    if (method === "link") {
      entry.promise = new Promise<void>((resolve) => {
        const link = document.createElement("link")
        link.rel = "prefetch"
        const kind = opts.kind ?? "document"
        if (kind !== "document") {
          link.as = kind
        }
        link.href = key
        if (opts.crossOrigin) link.crossOrigin = opts.crossOrigin
        if (opts.priority) {
          link.setAttribute("importance", opts.priority)
        }

        link.addEventListener("load", () => {
          done()
          resolve()
        })
        link.addEventListener("error", () => {
          fail()
          resolve()
        })
        document.head.appendChild(link)
        onIdle(() => {
          if (entry.state === "pending") {
            done()
            resolve()
          }
        })
      })
      return entry.promise
    }

    const controller = new AbortController()
    entry.abort = controller
    const abortSignal = opts.signal
    let abortCleanup: (() => void) | undefined
    if (abortSignal) {
      const onAbort = () => controller.abort()
      abortSignal.addEventListener("abort", onAbort, { once: true })
      abortCleanup = () => abortSignal.removeEventListener("abort", onAbort)
    }

    const promise = fetch(key, {
      method: "GET",
      credentials: "same-origin",
      cache: "default",
      mode: isSameOrigin(u) ? "same-origin" : "cors",
      signal: controller.signal,
      keepalive: true,
    })
      .then(() => {
        done()
      })
      .catch(() => {
        fail()
      })

    if (abortCleanup) {
      void promise.finally(abortCleanup)
    }

    entry.promise = promise
    return promise
  }

  bindAnchors(root?: ParentNode) {
    const container = root ?? document
    const anchors = Array.from(container.querySelectorAll<HTMLAnchorElement>("a[href]"))

    const listenHover = (a: HTMLAnchorElement, delay: number) => {
      let t: number | null = null
      const onEnter = () => {
        if (t !== null) return
        t = window.setTimeout(() => {
          const { url, options } = this.optsFromDataset(a)
          void this.prefetch(url, options)
        }, delay)
      }
      const clear = () => {
        if (t !== null) {
          clearTimeout(t)
          t = null
        }
      }
      a.addEventListener("pointerenter", onEnter, { passive: true })
      a.addEventListener("pointerleave", clear, { passive: true })
      return () => {
        a.removeEventListener("pointerenter", onEnter)
        a.removeEventListener("pointerleave", clear)
      }
    }

    const listenIntent = (a: HTMLAnchorElement, delay: number) => {
      const onDown = () => {
        const fire = () => {
          const { url, options } = this.optsFromDataset(a)
          void this.prefetch(url, options)
        }
        if (delay <= 0) fire()
        else setTimeout(fire, delay)
      }
      a.addEventListener("pointerdown", onDown, { passive: true })
      a.addEventListener("touchstart", onDown, { passive: true })
      return () => {
        a.removeEventListener("pointerdown", onDown)
        a.removeEventListener("touchstart", onDown)
      }
    }

    const io =
      this.linkObserver ??
      new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue
            const target = e.target
            if (!(target instanceof HTMLAnchorElement)) continue
            this.linkObserver?.unobserve(target)
            const { url, options } = this.optsFromDataset(target)
            void this.prefetch(url, options)
          }
        },
        { rootMargin: this.policy.visibleRootMargin }
      )

    this.linkObserver = io

    const unsubs: Array<() => void> = []

    for (const a of anchors) {
      if (a.target || a.hasAttribute("download")) continue
      const href = a.getAttribute("href") || ""
      if (!href) continue
      if (!absUrl(href)) continue

      const explicitRaw = a.getAttribute("data-prefetch")
      const disabled = explicitRaw === PREFETCH_DISABLE_VALUE
      const explicit = parsePrefetchStrategy(explicitRaw)
      const strategy = disabled
        ? "none"
        : (explicit ?? (this.policy.attachAllAnchors ? this.policy.defaultStrategy : "none"))

      if (!strategy || strategy === "none") continue
      if (this.seen.has(a)) continue
      this.seen.add(a)

      switch (strategy) {
        case "hover":
          unsubs.push(listenHover(a, this.policy.hoverDelayMs))
          break
        case "intent":
        case "tap":
          unsubs.push(listenIntent(a, this.policy.intentDelayMs))
          break
        case "visible":
          io.observe(a)
          break
        case "immediate":
          onIdle(() => {
            const { url, options } = this.optsFromDataset(a)
            void this.prefetch(url, options)
          })
          break
        default:
          break
      }
    }

    this.cleanupFns.push(() => unsubs.forEach((u) => u()))
  }

  private optsFromDataset(a: HTMLAnchorElement): { url: string; options: PrefetchOptions } {
    const urlOverride = a.getAttribute("data-prefetch-url")
    const url = urlOverride ?? a.href
    const method = parsePrefetchMethod(a.getAttribute("data-prefetch-method"))
    const ttlStr = a.getAttribute("data-prefetch-ttl")
    const ttlVal = ttlStr ? Number(ttlStr) : undefined
    const priority = parsePrefetchPriority(a.getAttribute("data-prefetch-priority"))
    const kind = parsePrefetchTarget(a.getAttribute("data-prefetch-kind")) ?? "document"
    const allowCrossOriginAttr = a.getAttribute("data-prefetch-allow-cross-origin")
    const allowCrossOrigin =
      allowCrossOriginAttr === "" || allowCrossOriginAttr === "true" || allowCrossOriginAttr === "1"

    const options: PrefetchOptions = { kind }
    if (method) options.method = method
    if (typeof ttlVal === "number" && Number.isFinite(ttlVal)) {
      options.ttlMs = ttlVal
    }
    if (priority) options.priority = priority
    if (allowCrossOrigin) options.allowCrossOrigin = true

    return { url, options }
  }

  observeMutations(root?: ParentNode) {
    if (!this.policy.watchMutations) return
    const container = root ?? document
    const mo =
      this.mutationObserver ??
      new MutationObserver((muts) => {
        let needsBind = false
        for (const m of muts) {
          if (m.type === "childList" && (m.addedNodes?.length ?? 0) > 0) {
            needsBind = true
            break
          }
        }
        if (needsBind) this.bindAnchors(container)
      })
    this.mutationObserver = mo
    mo.observe(container, { childList: true, subtree: true })
    this.cleanupFns.push(() => mo.disconnect())
  }

  start(root?: ParentNode) {
    if (!this.policy.enabled) return
    this.bindAnchors(root)
    this.observeMutations(root)
  }

  /**
   * Stop observing and clear internal listeners.
   */
  stop() {
    this.cleanupFns.forEach((fn) => {
      try {
        fn()
      } catch {
        // ignore
      }
    })
    this.cleanupFns = []
    this.linkObserver?.disconnect()
    this.linkObserver = null
    this.mutationObserver?.disconnect()
    this.mutationObserver = null
    this.seen = new WeakSet<HTMLAnchorElement>()
  }
}

/**
 * Create a `PrefetchClient` with the provided policy overrides.
 *
 * @example
 * ```ts
 * const prefetch = createPrefetchClient({
 *   defaultStrategy: "hover",
 *   respectDataSaver: true,
 *   respectSlowConnections: true,
 * })
 * prefetch.start()
 * ```
 */
export function createPrefetchClient(config?: Partial<PrefetchPolicy>) {
  return new PrefetchClient(config)
}
