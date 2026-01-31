# @honostar/cloudflare

Cloudflare Workers + Durable Objects integration for HonoStar.

Goal: keep Datastar SSE (`/_/events`) client-compatible, while using a Durable Object hub (hibernatable WebSockets) for cross-request fanout.

## What This Package Provides

- `CloudflareBusHub` (Durable Object): holds hibernatable WebSockets, fans out topic/client events, stores retained topic patches.
- `createCloudflareDurableObjectBus(...)`: `PubSubBus` implementation that publishes into the hub.
- `createCloudflareSseEndpoint(...)`: SSE endpoint handler for Workers that bridges hub WebSocket → browser SSE and runs CQRS queries.

## Wiring (Hono)

1. Bind the Durable Object in `wrangler.toml`:

```toml
[[durable_objects.bindings]]
name = "HONOSTAR_SSE_HUB"
class_name = "CloudflareBusHub"

[[migrations]]
tag = "v1"
new_classes = ["CloudflareBusHub"]
```

2. Export the DO class from your Worker entry.

3. Inject the bus + mount the SSE endpoint:

```ts
import { Hono } from "hono"
import type { AppEnv } from "@honostar/core/server"
import {
  createCloudflareDurableObjectBus,
  createCloudflareSseEndpoint,
  CloudflareBusHub,
} from "@honostar/cloudflare/server"

type Env = AppEnv & {
  Bindings: {
    HONOSTAR_SSE_HUB: DurableObjectNamespace<CloudflareBusHub>
  }
}

const app = new Hono<Env>()

app.use("*", async (c, next) => {
  c.set(
    "bus",
    createCloudflareDurableObjectBus({
      hub: c.env.HONOSTAR_SSE_HUB,
      hubName: "shared",
      // Ensures async publishes aren't dropped when the request returns early.
      waitUntil: c.executionCtx?.waitUntil?.bind(c.executionCtx),
    })
  )
  await next()
})

app.get(
  "/_/events",
  createCloudflareSseEndpoint({ hubName: "shared" /* , queries: collectedQueries */ })
)
```

## Known Limitations (Workers)

- Long-running background producers ("start an async stream then return") are not guaranteed in Workers.
  For reliable long streams, move the producer into a DO / Workflows / Queues.
- `subscribeClient/subscribeTopic` bus APIs are intentionally unsupported in `CloudflareDurableObjectBus`.
  Use `createCloudflareSseEndpoint` for connection lifecycle.
