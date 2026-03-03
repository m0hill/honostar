# Stream Live Data to the Client

Use HonoStar stream primitives when you need incremental progress/token/frame delivery over the existing SSE connection.

## 1. Start a client-scoped stream in a command

```ts
export const GET = defineCommand({
  async handler(c) {
    const stream = c.var.fx.streamClient("ai-tokens", {
      qos: { lane: "bulk", key: "ai-tokens", drop: true },
    })

    stream.open({ model: "demo" })

    for (const token of ["Hel", "lo", " ", "world"]) {
      if (stream.abortSignal?.aborted) break
      stream.chunkText(token, { coalesceMs: 20, target: { signal: "_tokens", mode: "append" } })
      await new Promise((r) => setTimeout(r, 10))
    }

    stream.close()
    return c.var.fx.ok()
  },
})
```

## 2. Subscribe in client runtime (optional)

```ts
window.Honostar.streams.subscribe("ai-tokens", (event) => {
  if (event.type === "error") console.error(event.message)
})
```

## 3. Use target application for no-DOM-patch streaming

`chunk` target examples:

- `{ signal: "_tokens", mode: "append" }`
- `{ selector: "#log", mode: "append" }`

## 4. Stop a running client stream (MemoryBus)

```ts
c.var.bus.abortClientStream?.(c.var.clientId, "ai-tokens")
```

## Guidance

- Use `lane: "bulk"` for high-frequency streams.
- Keep canonical shared UI on query fat patches, not stream chunks.
- For Cloudflare Workers, long-running producers should move to DO/Queues/Workflows.
