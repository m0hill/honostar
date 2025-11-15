import type { createPrefetchClient } from '@/core/prefetch'
import type { InspectorApi } from '@/core/runtime/inspector'
import type { ModalsApi } from '@/core/runtime/modals'
import type { PluginHandler, PluginsApi } from '@/core/runtime/plugins'
import type { ThemeController } from '@/core/theme-client'

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
          set: (pref: import('@/core/theme').ThemePreference) => void
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
