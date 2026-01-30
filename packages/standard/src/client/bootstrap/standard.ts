import "@honostar/core/client/bootstrap/minimal"

import {
  createModalHost,
  createPrefetchClient,
  ensureHonostar,
  freeze,
  installImageEnhancements,
  installPluginSystem,
  onPageRevealFocusApp,
  readRuntimeData,
} from "@honostar/core/client"
import { createInspector, type InspectorConfig } from "@honostar/inspector"

/**
 * Dynamically loads plugin entry points provided from the server config.
 */
async function loadPlugins(pluginPaths: string[]) {
  if (!pluginPaths || pluginPaths.length === 0) {
    return
  }

  for (const path of pluginPaths) {
    try {
      // Dynamically import the plugin module.
      // This executes the code, calling registerRuntimePlugin() for each plugin.
      await import(path)
      console.log(`[Honostar] Plugin module loaded: ${path}`)
    } catch (err) {
      console.error(`[Honostar] Failed to load plugin module: ${path}`, err)
    }
  }
}

void (async function bootstrap() {
  const data = readRuntimeData()
  const honostar = ensureHonostar()

  // Install plugin system early so user code can register plugins
  const plugins = installPluginSystem(data.assets.datastar)
  honostar.plugins = plugins

  // Dynamically load all configured plugins
  await loadPlugins(data.assets.plugins)

  const prefetch = createPrefetchClient({
    enabled: true,
    attachAllAnchors: true,
    defaultStrategy: "hover",
    respectDataSaver: true,
    respectSlowConnections: true,
  })
  prefetch.start()
  honostar.prefetch = prefetch

  installImageEnhancements()
  onPageRevealFocusApp()
  honostar.modals = createModalHost()

  const inspectorConfig = data.devtools?.inspector
  if (inspectorConfig?.enabled) {
    const inspector = createInspector(inspectorConfig satisfies InspectorConfig)
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
