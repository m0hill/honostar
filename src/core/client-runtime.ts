interface RuntimeData {
  csrfToken: string | null
}

function parseRuntimeData(raw: string): RuntimeData {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && 'csrfToken' in parsed) {
      const token = (parsed as { csrfToken?: unknown }).csrfToken
      return { csrfToken: typeof token === 'string' ? token : null }
    }
    return { csrfToken: null }
  } catch {
    return { csrfToken: null }
  }
}

function readRuntimeData(): RuntimeData {
  const el = document.getElementById('runtime-data')
  if (!el || !(el instanceof HTMLScriptElement)) {
    return { csrfToken: null }
  }

  const json = el.textContent?.trim()
  if (!json) return { csrfToken: null }
  return parseRuntimeData(json)
}

function generateTabId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `tab-${Math.random().toString(36).slice(2)}`
}

function ensureTabId(): string {
  try {
    let tabId = sessionStorage.getItem('tabId')
    if (!tabId) {
      tabId = generateTabId()
      sessionStorage.setItem('tabId', tabId)
    }
    return tabId
  } catch {
    return generateTabId()
  }
}

function patchFetch(tabId: string, csrfToken: string | null): void {
  const originalFetch = window.fetch
  const patchedFetch: typeof window.fetch = (input, init) => {
    const nextInit = init ?? {}
    const headers = new Headers(nextInit.headers ?? {})
    headers.set('X-Tab-ID', tabId)
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken)
    }
    nextInit.headers = headers
    return originalFetch(input, nextInit)
  }

  if (typeof originalFetch.preconnect === 'function') {
    patchedFetch.preconnect = originalFetch.preconnect.bind(originalFetch)
  }

  window.fetch = patchedFetch
}

function setupPrefetch(): void {
  const seen = new Set<string>()
  const conn = (
    navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }
  ).connection
  const saveData = Boolean(conn && conn.saveData)
  const slow = Boolean(conn && (conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g'))
  const enabled = !(saveData || slow)

  function prefetch(href: string): void {
    if (seen.has(href)) return
    seen.add(href)
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = href
    document.head.appendChild(link)
  }

  if (!enabled) return

  addEventListener(
    'pointerover',
    event => {
      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest('a')
      if (!anchor || anchor.target || anchor.hasAttribute('download')) return
      const href = anchor.getAttribute('href')
      if (!href) return
      const url = new URL(href, location.href)
      if (url.origin !== location.origin) return
      prefetch(url.href)
    },
    { capture: true }
  )
}

function enhanceImages(root?: ParentNode): void {
  const scope = (root ?? document).querySelectorAll<HTMLImageElement>('img')
  scope.forEach(img => {
    if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy')
    if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async')
  })
}

function setupImageEnhancements(): void {
  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        enhanceImages()
      },
      { once: true }
    )
  } else {
    enhanceImages()
  }
}

function focusApp(): void {
  const app = document.getElementById('app')
  if (!app) return
  if (!app.hasAttribute('tabindex')) app.setAttribute('tabindex', '-1')
  try {
    app.focus({ preventScroll: true })
  } catch {
    // no-op
  }
}

function setupFocusOnReveal(): void {
  addEventListener('pagereveal', focusApp, { once: true })
}

function bootstrap(): void {
  const { csrfToken } = readRuntimeData()
  const tabId = ensureTabId()
  patchFetch(tabId, csrfToken)
  setupPrefetch()
  setupImageEnhancements()
  setupFocusOnReveal()
}

bootstrap()
