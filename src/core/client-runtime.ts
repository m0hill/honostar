import type { ThemePreference, ThemeRuntimeConfig, ThemeValue } from '@/core/theme'
import { resolveThemeProvider } from '@/core/theme'
import { createPrefetchClient } from './prefetch'

type BrowserFetch = typeof window.fetch
type FetchInput = Parameters<BrowserFetch>[0]
type FetchInit = Parameters<BrowserFetch>[1]
type PreconnectFn = BrowserFetch['preconnect']

interface RuntimeData {
  csrfToken: string | null
  theme: ThemeRuntimeConfig
}

const FALLBACK_THEME_CONFIG = resolveThemeProvider().config
const FALLBACK_RUNTIME_DATA: RuntimeData = {
  csrfToken: null,
  theme: FALLBACK_THEME_CONFIG,
}

function isThemeValue(candidate: unknown): candidate is ThemeValue {
  return candidate === 'light' || candidate === 'dark'
}

function isThemePreference(candidate: unknown): candidate is ThemePreference {
  return candidate === 'system' || isThemeValue(candidate)
}

function normalizeThemeConfig(candidate: unknown): ThemeRuntimeConfig {
  if (!candidate || typeof candidate !== 'object') {
    return FALLBACK_THEME_CONFIG
  }
  const raw = candidate as Partial<ThemeRuntimeConfig>
  return {
    attribute:
      typeof raw.attribute === 'string' && raw.attribute.length > 0
        ? raw.attribute
        : FALLBACK_THEME_CONFIG.attribute,
    defaultTheme: isThemePreference(raw.defaultTheme)
      ? raw.defaultTheme
      : FALLBACK_THEME_CONFIG.defaultTheme,
    storageKey:
      typeof raw.storageKey === 'string' && raw.storageKey.length > 0
        ? raw.storageKey
        : FALLBACK_THEME_CONFIG.storageKey,
    respectSystemPreference:
      typeof raw.respectSystemPreference === 'boolean'
        ? raw.respectSystemPreference
        : FALLBACK_THEME_CONFIG.respectSystemPreference,
    disableTransitionClass:
      typeof raw.disableTransitionClass === 'string' || raw.disableTransitionClass === null
        ? raw.disableTransitionClass
        : FALLBACK_THEME_CONFIG.disableTransitionClass,
    rootSelector:
      typeof raw.rootSelector === 'string' && raw.rootSelector.length > 0
        ? raw.rootSelector
        : FALLBACK_THEME_CONFIG.rootSelector,
    systemFallback: isThemeValue(raw.systemFallback)
      ? raw.systemFallback
      : FALLBACK_THEME_CONFIG.systemFallback,
  }
}

function parseRuntimeData(raw: string): RuntimeData {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      const token = (parsed as { csrfToken?: unknown }).csrfToken
      return {
        csrfToken: typeof token === 'string' ? token : null,
        theme: normalizeThemeConfig((parsed as { theme?: unknown }).theme),
      }
    }
    return FALLBACK_RUNTIME_DATA
  } catch {
    return FALLBACK_RUNTIME_DATA
  }
}

function readRuntimeData(): RuntimeData {
  const el = document.getElementById('runtime-data')
  if (!el || !(el instanceof HTMLScriptElement)) {
    return FALLBACK_RUNTIME_DATA
  }

  const json = el.textContent?.trim()
  if (!json) return FALLBACK_RUNTIME_DATA
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

type ThemeControllerState = {
  preference: ThemePreference
  resolved: ThemeValue
}

interface ThemeController {
  getPreference: () => ThemePreference
  getResolvedTheme: () => ThemeValue
  setTheme: (value: ThemePreference) => void
  setLight: () => void
  setDark: () => void
  setSystem: () => void
  toggle: () => void
  subscribe: (listener: (state: ThemeControllerState) => void) => () => void
}

function disableThemeTransitions(
  root: HTMLElement,
  className: string | null,
  cb: () => void
): void {
  if (!className) {
    cb()
    return
  }
  root.classList.add(className)
  try {
    cb()
  } finally {
    requestAnimationFrame(() => {
      root.classList.remove(className)
    })
  }
}

function applyResolvedTheme(root: HTMLElement, attribute: string, resolved: ThemeValue): void {
  if (attribute === 'class') {
    root.classList.remove('light', 'dark')
    root.classList.add(resolved)
  } else {
    root.setAttribute(attribute, resolved)
  }
  root.dataset.themeResolved = resolved
}

function setupThemeController(config: ThemeRuntimeConfig): ThemeController | null {
  const doc = document
  const root =
    (config.rootSelector ? doc.querySelector<HTMLElement>(config.rootSelector) : null) ??
    doc.documentElement
  if (!root) return null

  const listeners = new Set<(state: ThemeControllerState) => void>()
  const systemMatcher =
    config.respectSystemPreference && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null

  const readStoredPreference = (): ThemePreference | null => {
    try {
      const stored = localStorage.getItem(config.storageKey)
      return isThemePreference(stored) ? stored : null
    } catch {
      return null
    }
  }

  const writeStoredPreference = (value: ThemePreference): void => {
    try {
      localStorage.setItem(config.storageKey, value)
    } catch {
      // no-op
    }

    // Also write to a cookie so the server can read it on subsequent requests
    // This allows the server to set the correct initial theme class and avoid FOUC
    try {
      // Set cookie with 1 year expiry, path=/, SameSite=Lax
      const maxAge = 60 * 60 * 24 * 365 // 1 year in seconds
      document.cookie = `${config.storageKey}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`
    } catch {
      // no-op
    }
  }

  const resolveSystemTheme = (): ThemeValue => {
    if (!systemMatcher) return config.systemFallback
    return systemMatcher.matches ? 'dark' : 'light'
  }

  const resolvePreference = (pref: ThemePreference): ThemeValue =>
    pref === 'system' ? resolveSystemTheme() : pref

  const applyPreference = (pref: ThemePreference): ThemeValue => {
    const resolved = resolvePreference(pref)
    disableThemeTransitions(root, config.disableTransitionClass, () => {
      applyResolvedTheme(root, config.attribute, resolved)
      root.dataset.themePreference = pref
    })
    return resolved
  }

  let preference: ThemePreference = readStoredPreference() ?? config.defaultTheme
  let resolved: ThemeValue = applyPreference(preference)

  const emit = (): void => {
    const state: ThemeControllerState = { preference, resolved }
    listeners.forEach(listener => {
      try {
        listener(state)
      } catch {
        // swallow listener errors
      }
    })
    try {
      window.dispatchEvent(new CustomEvent('bonsai-theme-change', { detail: state }))
    } catch {
      // ignore
    }
  }

  const setPreference = (next: ThemePreference): void => {
    if (preference === next) {
      // Still ensure DOM reflects current system preference when applicable
      if (next === 'system') {
        const nextResolved = applyPreference(next)
        if (nextResolved !== resolved) {
          resolved = nextResolved
          emit()
        }
      }
      return
    }
    preference = next
    writeStoredPreference(next)
    resolved = applyPreference(next)
    emit()
  }

  const controller: ThemeController = Object.freeze({
    getPreference: () => preference,
    getResolvedTheme: () => resolved,
    setTheme: setPreference,
    setLight: () => setPreference('light'),
    setDark: () => setPreference('dark'),
    setSystem: () => setPreference('system'),
    toggle: () => setPreference(resolved === 'dark' ? 'light' : 'dark'),
    subscribe: (listener: (state: ThemeControllerState) => void) => {
      listeners.add(listener)
      listener({ preference, resolved })
      return () => {
        listeners.delete(listener)
      }
    },
  })

  if (systemMatcher) {
    const legacyMatcher = systemMatcher as MediaQueryList & {
      addListener?: (listener: (this: MediaQueryList, ev: MediaQueryListEvent) => void) => void
    }
    const systemListener = () => {
      if (preference !== 'system') return
      const nextResolved = applyPreference('system')
      if (nextResolved !== resolved) {
        resolved = nextResolved
        emit()
      }
    }
    if (typeof systemMatcher.addEventListener === 'function') {
      systemMatcher.addEventListener('change', systemListener)
    } else if (typeof legacyMatcher.addListener === 'function') {
      legacyMatcher.addListener(systemListener)
    }
  }

  return controller
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
      theme?: ThemeController
      prefetch?: ReturnType<typeof createPrefetchClient>
      modals?: {
        closeAll: () => void
        close: (id: string) => void
        count: () => number
      }
      actions?: {
        theme: {
          set: (pref: ThemePreference) => void
          setLight: () => void
          setDark: () => void
          setSystem: () => void
          toggle: () => void
        }
      }
    }
  }
}

function bootstrap(): void {
  const runtimeData = readRuntimeData()
  const tabId = ensureTabId()
  patchFetch(tabId, runtimeData.csrfToken)
  const themeController = setupThemeController(runtimeData.theme)

  const prefetch = createPrefetchClient({
    enabled: true,
    attachAllAnchors: true,
    defaultStrategy: 'hover',
    respectDataSaver: true,
    respectSlowConnections: true,
  })
  prefetch.start()

  window.Bonsai = window.Bonsai ?? {}
  if (themeController) {
    window.Bonsai.theme = themeController
  }
  window.Bonsai.prefetch = prefetch

  // Namespaced actions API (official framework API)
  const themeActions = {
    set: (pref: ThemePreference) => themeController?.setTheme(pref),
    setLight: () => themeController?.setLight(),
    setDark: () => themeController?.setDark(),
    setSystem: () => themeController?.setSystem(),
    toggle: () => themeController?.toggle(),
  }

  // Harden the API to discourage mutation
  Object.freeze(themeActions)

  window.Bonsai.actions = {
    theme: themeActions,
  }

  setupImageEnhancements()
  setupFocusOnReveal()
  setupModalHost()
}

bootstrap()
