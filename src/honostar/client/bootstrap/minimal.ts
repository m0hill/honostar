import { installFetchAugmentation } from '@/honostar/client/runtime/fetch'
import { ensureHonostar } from '@/honostar/client/runtime/global'
import { readRuntimeData } from '@/honostar/client/runtime/runtime-data'
import { ensureTabId } from '@/honostar/client/runtime/tab'
import { createThemeController, installThemeActions } from '@/honostar/client/theme'

;(function bootstrap() {
  const data = readRuntimeData()
  const tabId = ensureTabId()
  installFetchAugmentation({ tabId, csrfToken: data.csrfToken })

  const theme = createThemeController(data.theme)
  if (theme) installThemeActions(theme)

  const honostar = ensureHonostar()
  honostar.theme = theme ?? undefined
})()
