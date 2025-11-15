import { installFetchAugmentation } from '@/core/runtime/fetch'
import { ensureHonostar } from '@/core/runtime/honostar-global'
import { readRuntimeData } from '@/core/runtime/runtime-data'
import { ensureTabId } from '@/core/runtime/tab'
import { createThemeController, installThemeActions } from '@/core/theme-client'

;(function bootstrap() {
  const data = readRuntimeData()
  const tabId = ensureTabId()
  installFetchAugmentation({ tabId, csrfToken: data.csrfToken })

  const theme = createThemeController(data.theme)
  if (theme) installThemeActions(theme)

  const honostar = ensureHonostar()
  honostar.theme = theme ?? undefined
})()
