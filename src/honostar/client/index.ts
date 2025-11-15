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
export type {
  PrefetchClient,
  PrefetchOptions,
  PrefetchPolicy,
} from './prefetch'
// ============================================================================
// PREFETCH
// ============================================================================
export { createPrefetchClient } from './prefetch'

export { installFetchAugmentation } from './runtime/fetch'
export { onPageRevealFocusApp } from './runtime/focus'
export { ensureHonostar, freeze } from './runtime/global'
export { installImageEnhancements } from './runtime/image'
export { createModalHost } from './runtime/modals'
export type {
  DatastarActionContext,
  DatastarActionModule,
  PluginHandler,
} from './runtime/plugins'
// ============================================================================
// RUNTIME
// ============================================================================
export { installPluginSystem, registerRuntimePlugin } from './runtime/plugins'
export { readRuntimeData } from './runtime/runtime-data'
export { ensureTabId } from './runtime/tab'

// ============================================================================
// THEME
// ============================================================================
export type { ThemeController } from './theme'
export { createThemeController, installThemeActions } from './theme'
