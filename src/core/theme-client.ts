import { ensureBonsai, freeze } from '@/core/runtime/bonsai-global'
import type { ThemePreference, ThemeRuntimeConfig, ThemeValue } from '@/core/theme'

type ThemeControllerState = {
  preference: ThemePreference
  resolved: ThemeValue
}

export type ThemeController = {
  getPreference(): ThemePreference
  getResolvedTheme(): ThemeValue
  setTheme(value: ThemePreference): void
  setLight(): void
  setDark(): void
  setSystem(): void
  toggle(): void
  subscribe(listener: (state: ThemeControllerState) => void): () => void
}

function isThemeValue(candidate: unknown): candidate is ThemeValue {
  return candidate === 'light' || candidate === 'dark'
}

function isThemePreference(candidate: unknown): candidate is ThemePreference {
  return candidate === 'system' || isThemeValue(candidate)
}

export function createThemeController(config: ThemeRuntimeConfig): ThemeController | null {
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
    } catch {}
    try {
      const maxAge = 60 * 60 * 24 * 365
      document.cookie = `${config.storageKey}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`
    } catch {}
  }

  const resolveSystemTheme = (): ThemeValue => {
    if (!systemMatcher) return config.systemFallback
    return systemMatcher.matches ? 'dark' : 'light'
  }

  const resolvePreference = (pref: ThemePreference): ThemeValue =>
    pref === 'system' ? resolveSystemTheme() : pref

  const applyResolvedTheme = (resolved: ThemeValue, pref: ThemePreference): void => {
    if (config.attribute === 'class') {
      root.classList.remove('light', 'dark')
      root.classList.add(resolved)
    } else {
      root.setAttribute(config.attribute, resolved)
    }
    root.dataset.themeResolved = resolved
    root.dataset.themePreference = pref
  }

  const disableThemeTransitions = (cb: () => void): void => {
    const className = config.disableTransitionClass
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

  const applyPreference = (pref: ThemePreference): ThemeValue => {
    const resolved = resolvePreference(pref)
    disableThemeTransitions(() => {
      applyResolvedTheme(resolved, pref)
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
      } catch {}
    })
    try {
      window.dispatchEvent(new CustomEvent('bonsai-theme-change', { detail: state }))
    } catch {}
  }

  const setPreference = (next: ThemePreference): void => {
    if (preference === next) {
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

  const controller: ThemeController = freeze({
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

export function installThemeActions(controller: ThemeController): void {
  const bonsai = ensureBonsai()
  const actions = freeze({
    set: (p: ThemePreference) => controller.setTheme(p),
    setLight: () => controller.setLight(),
    setDark: () => controller.setDark(),
    setSystem: () => controller.setSystem(),
    toggle: () => controller.toggle(),
  })
  bonsai.actions = {
    ...bonsai.actions,
    theme: actions,
  }
}
