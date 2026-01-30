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
    /**
     * Set by the server-rendered HTML before Datastar initializes, so the initial SSE connect
     * can include `X-Tab-ID` even if runtime JS is code-split/deferred by the bundler.
     */
    __honostarTabId?: string
    /**
     * Marker set when fetch has already been patched to include Honostar headers.
     * This allows the client runtime to avoid double-wrapping fetch.
     */
    __honostarFetchBootstrapped?: true
    __honostarPendingPluginRegistrations?: Array<{
      name: string
      handler: PluginHandler
    }>
  }
}
