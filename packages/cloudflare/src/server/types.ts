import type { HonostarConfig, QueryRegistration } from "@honostar/core/server"
import type { CloudflareBusHub } from "./hub"

export type CloudflareSseHubEnv = {
  HONOSTAR_SSE_HUB: DurableObjectNamespace<CloudflareBusHub>
}

export type CloudflareSseEndpointOptions = {
  config?: Partial<HonostarConfig>
  hubName?: string
  queries?: QueryRegistration[]
}
