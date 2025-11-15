import { createPrefetchClient } from '@/core/prefetch'
import { installFetchAugmentation } from '@/core/runtime/fetch'
import { onPageRevealFocusApp } from '@/core/runtime/focus'
import { ensureHonostar, freeze } from '@/core/runtime/honostar-global'
import { installImageEnhancements } from '@/core/runtime/image'
import type { InspectorConfig } from '@/core/runtime/inspector'
import { createInspector } from '@/core/runtime/inspector'
import { createModalHost } from '@/core/runtime/modals'
import { installPluginSystem } from '@/core/runtime/plugins'
import { readRuntimeData } from '@/core/runtime/runtime-data'
import { ensureTabId } from '@/core/runtime/tab'
import { createThemeController, installThemeActions } from '@/core/theme-client'

// Import built-in plugins to register them with Datastar
import '@/runtime/plugins'

;(function bootstrap() {
  const data = readRuntimeData()
  const tabId = ensureTabId()
  installFetchAugmentation({ tabId, csrfToken: data.csrfToken })

  const theme = createThemeController(data.theme)
  if (theme) installThemeActions(theme)

  const honostar = ensureHonostar()
  honostar.theme = theme ?? undefined

  // Install plugin system early so user code can register plugins
  const plugins = installPluginSystem(data.assets.datastar)
  honostar.plugins = plugins

  const prefetch = createPrefetchClient({
    enabled: true,
    attachAllAnchors: true,
    defaultStrategy: 'hover',
    respectDataSaver: true,
    respectSlowConnections: true,
  })
  prefetch.start()
  honostar.prefetch = prefetch

  installImageEnhancements()
  onPageRevealFocusApp()
  honostar.modals = createModalHost()

  // Initialize inspector if enabled (check both env and explicit config)
  // In development, enable by default; in production, require explicit opt-in
  const isDev = location.hostname === 'localhost' || location.hostname.startsWith('127.')
  const inspectorEnabled = isDev // Enable in dev by default

  if (inspectorEnabled) {
    const inspectorConfig: InspectorConfig = {
      enabled: true,
      keyboardShortcut: 'Ctrl+Shift+D',
      maxEvents: 100,
      defaultTab: 'signals',
      defaultViewMode: 'json',
      defaultPosition: 'bottom',
    }

    const inspector = createInspector(inspectorConfig)
    honostar.inspector = inspector

    // Expose actions for programmatic control
    honostar.actions = {
      ...honostar.actions,
      inspector: freeze({
        open: () => inspector.open(),
        close: () => inspector.close(),
        toggle: () => inspector.toggle(),
      }),
    }
  }
})()
