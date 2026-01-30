import { installFetchAugmentation } from "../runtime/fetch"
import { ensureHonostar } from "../runtime/global"
import { installStreamRuntime } from "../runtime/streams"
import { readRuntimeData } from "../runtime/runtime-data"
import { ensureTabId } from "../runtime/tab"
import { createThemeController, installThemeActions } from "../theme"

;(function bootstrap() {
  const data = readRuntimeData()
  const tabId = ensureTabId()
  installFetchAugmentation({ tabId, csrfToken: data.csrfToken })

  const theme = createThemeController(data.theme)
  if (theme) installThemeActions(theme)

  void installStreamRuntime(data.assets.datastar)

  const honostar = ensureHonostar()
  honostar.theme = theme ?? undefined
})()
