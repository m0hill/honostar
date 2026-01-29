import type { createPrefetchClient } from "../prefetch"
import type { ModalsApi } from "../runtime/modals"
import type { PluginHandler, PluginsApi } from "../runtime/plugins"
import type { ThemeController } from "../theme"

export {}

declare global {
  interface HonostarActions {
    theme?: {
      set: (pref: import("../../common/theme").ThemePreference) => void
      setLight: () => void
      setDark: () => void
      setSystem: () => void
      toggle: () => void
    }
  }

  interface HonostarApi {
    theme?: ThemeController | undefined
    prefetch?: ReturnType<typeof createPrefetchClient> | undefined
    modals?: ModalsApi | undefined
    plugins?: PluginsApi | undefined
    actions?: HonostarActions
  }

  interface Window {
    Honostar?: HonostarApi
    __honostarPendingPluginRegistrations?: Array<{
      name: string
      handler: PluginHandler
    }>
  }
}
