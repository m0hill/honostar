import { createPrefetchClient } from './prefetch'

type BrowserFetch = typeof window.fetch
type FetchInput = Parameters<BrowserFetch>[0]
type FetchInit = Parameters<BrowserFetch>[1]
type PreconnectFn = BrowserFetch['preconnect']

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
  const originalFetch: BrowserFetch = window.fetch
  const originalPreconnect: PreconnectFn | undefined = originalFetch.preconnect?.bind(originalFetch)
  const patchedFetch: BrowserFetch = Object.assign(
    (input: FetchInput, init?: FetchInit) => {
      const nextInit = init ?? {}
      const headers = new Headers(nextInit.headers ?? {})
      headers.set('X-Tab-ID', tabId)
      if (csrfToken) {
        headers.set('X-CSRF-Token', csrfToken)
      }
      nextInit.headers = headers
      return originalFetch(input, nextInit)
    },
    {
      preconnect: (...args: Parameters<PreconnectFn>) => {
        originalPreconnect?.(...args)
      },
    }
  )

  window.fetch = patchedFetch
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

declare global {
  interface Window {
    Bonsai?: {
      prefetch?: ReturnType<typeof createPrefetchClient>
    }
  }
}

function bootstrap(): void {
  const { csrfToken } = readRuntimeData()
  const tabId = ensureTabId()
  patchFetch(tabId, csrfToken)

  const prefetch = createPrefetchClient({
    enabled: true,
    attachAllAnchors: true,
    defaultStrategy: 'hover',
    respectDataSaver: true,
    respectSlowConnections: true,
  })
  prefetch.start()

  window.Bonsai = window.Bonsai ?? {}
  window.Bonsai.prefetch = prefetch

  setupImageEnhancements()
  setupFocusOnReveal()
}

bootstrap()
