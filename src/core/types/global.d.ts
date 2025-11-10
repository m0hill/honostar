import type { ThemeController } from '@/core/theme-client'
import type { ModalsApi } from '@/core/runtime/modals'
import type { createPrefetchClient } from '@/core/prefetch'
import type { InspectorApi } from '@/core/runtime/inspector'

declare global {
  interface Window {
    Bonsai?: {
      theme?: ThemeController | undefined
      prefetch?: ReturnType<typeof createPrefetchClient> | undefined
      modals?: ModalsApi | undefined
      inspector?: InspectorApi | undefined
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
  }
}
