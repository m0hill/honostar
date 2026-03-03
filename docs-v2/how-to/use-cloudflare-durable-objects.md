# Use Cloudflare Durable Objects

Use `@honostar/cloudflare` to run HonoStar SSE fanout on Cloudflare Workers with a Durable Object hub.

## 1. Add Durable Object binding

`wrangler.toml`:

```toml
[[durable_objects.bindings]]
name = "HONOSTAR_SSE_HUB"
class_name = "CloudflareBusHub"

[[migrations]]
tag = "v1"
new_classes = ["CloudflareBusHub"]
```

## 2. Export the hub class

From your worker entry module:

```ts
export { CloudflareBusHub } from "@honostar/cloudflare/server"
```

## 3. Inject Cloudflare bus

```ts
import { createCloudflareDurableObjectBus } from "@honostar/cloudflare/server"

app.use("*", async (c, next) => {
  c.set(
    "bus",
    createCloudflareDurableObjectBus({
      hub: c.env.HONOSTAR_SSE_HUB,
      hubName: "shared",
      waitUntil: c.executionCtx?.waitUntil?.bind(c.executionCtx),
    })
  )
  await next()
})
```

## 4. Mount Cloudflare SSE endpoint

```ts
import { createCloudflareSseEndpoint } from "@honostar/cloudflare/server"

app.get(
  "/_/events",
  createCloudflareSseEndpoint({
    hubName: "shared",
    queries: collectedQueries,
    config,
  })
)
```

## 5. Keep normal HonoStar page/command model

Your `defineQueryPage` and `defineCommand` modules remain the same. Only bus + SSE endpoint wiring changes.

## Known limitations

- `subscribeClient/subscribeTopic` are intentionally unsupported in `CloudflareDurableObjectBus`.
- Use `createCloudflareSseEndpoint` for connection lifecycle.
- Long-running background producers should live in Durable Objects, Workflows, or Queues.

## Security

Still set `HONOSTAR_SIGNING_SECRET` in production to enforce topic allowlist verification.
