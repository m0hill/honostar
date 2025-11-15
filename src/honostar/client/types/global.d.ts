import type { createPrefetchClient } from '@/honostar/client/prefetch'
import type { InspectorApi } from '@/honostar/client/inspector'
import type { ModalsApi } from '@/honostar/client/runtime/modals'
import type { PluginHandler, PluginsApi } from '@/honostar/client/runtime/plugins'
import type { ThemeController } from '@/honostar/client/theme'

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
          set: (pref: import('@/honostar/common/theme').ThemePreference) => void
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
