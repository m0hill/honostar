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

function focusModalContent(root: ParentNode): void {
  queueMicrotask(() => {
    const target =
      root.querySelector<HTMLElement>('[data-auto-focus]') ??
      root.querySelector<HTMLElement>(
        'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
      )
    try {
      target?.focus()
    } catch {
      // no-op
    }
  })
}

function setupModalHost(): void {
  const host = document.getElementById('ds-overlays')
  if (!host) return

  const app = document.getElementById('app')
  const setInert = (on: boolean) => {
    if (!app) return
    if (on) {
      app.setAttribute('inert', '')
      document.body.style.overflow = 'hidden'
    } else {
      app.removeAttribute('inert')
      document.body.style.overflow = ''
    }
  }

  const hasAnyModal = () => Boolean(host.querySelector('[data-modal]'))
  const releaseIfNone = () => {
    if (!hasAnyModal()) setInert(false)
  }

  const activateModalElement = (el: HTMLElement) => {
    setInert(true)
    focusModalContent(el)
  }

  const openDialog = (dlg: HTMLDialogElement) => {
    try {
      if (!dlg.open && typeof dlg.showModal === 'function') {
        dlg.showModal()
      } else if (!dlg.open) {
        dlg.setAttribute('open', '')
      }
    } catch {
      dlg.setAttribute('open', '')
    }
    setInert(true)
    const onClose = () => {
      dlg.removeEventListener('close', onClose)
      dlg.remove()
      releaseIfNone()
    }
    dlg.addEventListener('close', onClose, { once: true })
    focusModalContent(dlg)
  }

  host.addEventListener('click', e => {
    const target = e.target
    if (!(target instanceof HTMLElement)) return
    const dismiss = target.closest('[data-modal-dismiss]')
    if (!dismiss) return
    const dialog = target.closest('dialog[data-modal]')
    if (dialog instanceof HTMLDialogElement) {
      try {
        dialog.close()
      } catch {
        dialog.remove()
        releaseIfNone()
      }
    } else {
      const el = target.closest('[data-modal]')
      if (el instanceof HTMLElement) {
        el.remove()
        releaseIfNone()
      }
    }
  })

  const mo = new MutationObserver(muts => {
    for (const m of muts) {
      m.addedNodes.forEach(node => {
        if (!(node instanceof HTMLElement)) return
        const dialogCandidates = node.matches('dialog[data-modal]')
          ? [node]
          : Array.from(node.querySelectorAll('dialog[data-modal]'))
        for (const el of dialogCandidates) {
          if (!(el instanceof HTMLDialogElement)) continue
          if (el.hasAttribute('data-auto-open')) {
            openDialog(el)
          }
        }
        const modalCandidates = node.matches('[data-modal]')
          ? [node]
          : Array.from(node.querySelectorAll<HTMLElement>('[data-modal]'))
        for (const el of modalCandidates) {
          if (el instanceof HTMLDialogElement) continue
          activateModalElement(el)
        }
      })
      if (m.removedNodes.length > 0) releaseIfNone()
    }
  })
  mo.observe(host, { childList: true, subtree: true })

  window.Bonsai = window.Bonsai ?? {}
  window.Bonsai.modals = {
    closeAll: () => {
      host.querySelectorAll<HTMLDialogElement>('dialog[data-modal]').forEach(d => {
        try {
          d.close()
        } catch {
          d.remove()
        }
      })
      host.innerHTML = ''
      setInert(false)
    },
    close: (id: string) => {
      const el = host.querySelector<HTMLElement>(`[data-modal-id="${CSS.escape(id)}"]`)
      if (!el) return
      const dlg = el.closest('dialog[data-modal]')
      if (dlg instanceof HTMLDialogElement) {
        try {
          dlg.close()
        } catch {
          dlg.remove()
          releaseIfNone()
        }
      } else {
        el.remove()
        releaseIfNone()
      }
    },
    count: () => host.querySelectorAll('[data-modal]').length,
  }
}

declare global {
  interface Window {
    Bonsai?: {
      prefetch?: ReturnType<typeof createPrefetchClient>
      modals?: {
        closeAll: () => void
        close: (id: string) => void
        count: () => number
      }
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
  setupModalHost()
}

bootstrap()
