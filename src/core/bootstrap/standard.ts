import { createPrefetchClient } from '@/core/prefetch'
import { ensureBonsai, freeze } from '@/core/runtime/bonsai-global'
import { installFetchAugmentation } from '@/core/runtime/fetch'
import { onPageRevealFocusApp } from '@/core/runtime/focus'
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

  const bonsai = ensureBonsai()
  bonsai.theme = theme ?? undefined

  // Install plugin system early so user code can register plugins
  const plugins = installPluginSystem(data.assets.datastar)
  bonsai.plugins = plugins

  const prefetch = createPrefetchClient({
    enabled: true,
    attachAllAnchors: true,
    defaultStrategy: 'hover',
    respectDataSaver: true,
    respectSlowConnections: true,
  })
  prefetch.start()
  bonsai.prefetch = prefetch

  installImageEnhancements()
  onPageRevealFocusApp()
  bonsai.modals = createModalHost()

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
    bonsai.inspector = inspector

    // Expose actions for programmatic control
    bonsai.actions = {
      ...bonsai.actions,
      inspector: freeze({
        open: () => inspector.open(),
        close: () => inspector.close(),
        toggle: () => inspector.toggle(),
      }),
    }
  }
})()
