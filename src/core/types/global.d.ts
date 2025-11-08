import type { ThemeController } from '@/core/theme-client'
import type { ModalsApi } from '@/core/runtime/modals'
import type { createPrefetchClient } from '@/core/prefetch'

declare global {
  interface Window {
    Bonsai?: {
      theme?: ThemeController | undefined
      prefetch?: ReturnType<typeof createPrefetchClient> | undefined
      modals?: ModalsApi | undefined
      actions?: {
        theme: {
          set: (pref: import('@/core/theme').ThemePreference) => void
          setLight: () => void
          setDark: () => void
          setSystem: () => void
          toggle: () => void
        }
      }
    }
  }
}
