import type { ThemePreference, ThemeRuntimeConfig, ThemeValue } from '@/core/theme'
import { resolveThemeProvider } from '@/core/theme'

type RuntimeData = {
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

export function readRuntimeData(): RuntimeData {
  const el = document.getElementById('runtime-data')
  if (!el || !(el instanceof HTMLScriptElement)) {
    return FALLBACK_RUNTIME_DATA
  }

  const json = el.textContent?.trim()
  if (!json) return FALLBACK_RUNTIME_DATA
  return parseRuntimeData(json)
}
