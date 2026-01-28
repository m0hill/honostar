import type { ThemePreference, ThemeRuntimeConfig, ThemeValue } from '../../common/theme'
import { resolveThemeProvider } from '../../common/theme'
import type { InspectorPosition, InspectorTab, InspectorViewMode } from '../inspector'

type RuntimeAssets = {
  css: string
  runtime: string
  datastar: string
  plugins: string[]
}

type RuntimeInspectorConfig = {
  enabled: boolean
  maxEvents: number
  defaultTab: InspectorTab
  defaultViewMode: InspectorViewMode
  defaultPosition: InspectorPosition
}

type RuntimeData = {
  csrfToken: string | null
  theme: ThemeRuntimeConfig
  assets: RuntimeAssets
  devtools: {
    inspector: RuntimeInspectorConfig | null
  }
}

const FALLBACK_THEME_CONFIG = resolveThemeProvider().config
const FALLBACK_ASSETS: RuntimeAssets = {
  css: '/styles.css',
  runtime: '/runtime.js',
  datastar: '/datastar.js',
  plugins: [],
}
const FALLBACK_RUNTIME_DATA: RuntimeData = {
  csrfToken: null,
  theme: FALLBACK_THEME_CONFIG,
  assets: FALLBACK_ASSETS,
  devtools: { inspector: null },
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

function normalizeAssets(candidate: unknown): RuntimeAssets {
  if (!candidate || typeof candidate !== 'object') {
    return FALLBACK_ASSETS
  }
  const raw = candidate as Partial<RuntimeAssets>
  return {
    css: typeof raw.css === 'string' && raw.css.length > 0 ? raw.css : FALLBACK_ASSETS.css,
    runtime:
      typeof raw.runtime === 'string' && raw.runtime.length > 0
        ? raw.runtime
        : FALLBACK_ASSETS.runtime,
    datastar:
      typeof raw.datastar === 'string' && raw.datastar.length > 0
        ? raw.datastar
        : FALLBACK_ASSETS.datastar,
    plugins:
      Array.isArray(raw.plugins) && raw.plugins.every(p => typeof p === 'string')
        ? raw.plugins
        : FALLBACK_ASSETS.plugins,
  }
}

function normalizeInspectorConfig(candidate: unknown): RuntimeInspectorConfig | null {
  if (!candidate || typeof candidate !== 'object') return null
  const raw = candidate as Partial<RuntimeInspectorConfig>

  if (raw.enabled !== true) return null

  return {
    enabled: true,
    maxEvents: typeof raw.maxEvents === 'number' ? raw.maxEvents : 100,
    defaultTab:
      raw.defaultTab === 'signals' ||
      raw.defaultTab === 'patches' ||
      raw.defaultTab === 'sse' ||
      raw.defaultTab === 'persisted'
        ? raw.defaultTab
        : 'signals',
    defaultViewMode:
      raw.defaultViewMode === 'table' || raw.defaultViewMode === 'json'
        ? raw.defaultViewMode
        : 'json',
    defaultPosition:
      raw.defaultPosition === 'bottom' ||
      raw.defaultPosition === 'right' ||
      raw.defaultPosition === 'left' ||
      raw.defaultPosition === 'top'
        ? raw.defaultPosition
        : 'bottom',
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
        assets: normalizeAssets((parsed as { assets?: unknown }).assets),
        devtools: {
          inspector: normalizeInspectorConfig(
            (parsed as { devtools?: { inspector?: unknown } }).devtools?.inspector
          ),
        },
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
