import type { createPrefetchClient } from '../prefetch'
import type { InspectorApi } from '../inspector'
import type { ModalsApi } from '../runtime/modals'
import type { PluginHandler, PluginsApi } from '../runtime/plugins'
import type { ThemeController } from '../theme'

declare global {
  interface Window {
    Honostar?: {
      theme?: ThemeController | undefined
      prefetch?: ReturnType<typeof createPrefetchClient> | undefined
      modals?: ModalsApi | undefined
      inspector?: InspectorApi | undefined
      plugins?: PluginsApi | undefined
      actions?: {
        theme?: {
          set: (pref: import('../../common/theme').ThemePreference) => void
          setLight: () => void
          setDark: () => void
          setSystem: () => void
          toggle: () => void
        }
        inspector?: {
          open: () => void
          close: () => void
          toggle: () => void
        }
      }
    }
    __honostarPendingPluginRegistrations?: Array<{
      name: string
      handler: PluginHandler
    }>
  }
}
