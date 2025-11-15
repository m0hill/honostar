// ============================================================================
// INSPECTOR
// ============================================================================
export { createInspector } from './inspector'
export type {
  InspectorApi,
  InspectorConfig,
  InspectorTab,
  InspectorViewMode,
  SignalFilter,
} from './inspector/types'

// ============================================================================
// RUNTIME
// ============================================================================
export { registerRuntimePlugin, installPluginSystem } from './runtime/plugins'
export type {
  PluginHandler,
  DatastarActionContext,
  DatastarActionModule,
} from './runtime/plugins'

export { installFetchAugmentation } from './runtime/fetch'
export { ensureHonostar, freeze } from './runtime/global'
export { readRuntimeData } from './runtime/runtime-data'
export { ensureTabId } from './runtime/tab'
export { onPageRevealFocusApp } from './runtime/focus'
export { installImageEnhancements } from './runtime/image'
export { createModalHost } from './runtime/modals'

// ============================================================================
// PREFETCH
// ============================================================================
export { createPrefetchClient } from './prefetch'
export type {
  PrefetchClient,
  PrefetchOptions,
  PrefetchPolicy,
} from './prefetch'

// ============================================================================
// THEME
// ============================================================================
export type { ThemeController } from './theme'
export { createThemeController, installThemeActions } from './theme'
