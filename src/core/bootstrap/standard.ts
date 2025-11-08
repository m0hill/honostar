import { createPrefetchClient } from '@/core/prefetch'
import { ensureBonsai } from '@/core/runtime/bonsai-global'
import { installFetchAugmentation } from '@/core/runtime/fetch'
import { onPageRevealFocusApp } from '@/core/runtime/focus'
import { installImageEnhancements } from '@/core/runtime/image'
import { createModalHost } from '@/core/runtime/modals'
import { readRuntimeData } from '@/core/runtime/runtime-data'
import { ensureTabId } from '@/core/runtime/tab'
import { createThemeController, installThemeActions } from '@/core/theme-client'

;(function bootstrap() {
  const data = readRuntimeData()
  const tabId = ensureTabId()
  installFetchAugmentation({ tabId, csrfToken: data.csrfToken })

  const theme = createThemeController(data.theme)
  if (theme) installThemeActions(theme)

  const bonsai = ensureBonsai()
  bonsai.theme = theme ?? undefined

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
})()
