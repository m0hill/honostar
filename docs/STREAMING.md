# Streaming (First-Class Primitive)

Honostar treats **streaming as a first-class primitive** that runs over the **existing** Datastar SSE
connection (`/_/events`).

This is designed for things like:

- Tab-scoped progress/log streams (uploads, benchmarks like Bad Apple, AI tokens)
- Topic-scoped shared live feeds (advanced; requires topic signing)

The goal is: **no more hand-rolling extra SSE endpoints** for every streaming feature.

## What “streaming” means in Honostar

- Your app keeps a single SSE connection open: `/_/events`
- The server can send:
  - Datastar-native events (`datastar-patch-signals`, `datastar-patch-elements`, `execute-script`)
  - Honostar stream events:
    - `datastar-honostar-stream-open`
    - `datastar-honostar-stream-chunk`
    - `datastar-honostar-stream-close`
    - `datastar-honostar-stream-error`
- The client runtime installs Datastar watchers for these stream events and exposes a small API on
  `window.Honostar`.

## Server API

All streaming starts from `c.var.fx`:

- `c.var.fx.streamClient(streamId, opts?)`
- `c.var.fx.streamTopic(topic, streamId, opts?)`

The returned stream supports:

- Lifecycle: `open(meta?)`, `close()`, `error(message)`
- Data:
  - `signals(patch)` → emits `datastar-patch-signals`
  - `elements(jsxOrHtml, opts?)` → emits `datastar-patch-elements`
  - `executeScript(script, opts?)`
  - `chunk({ kind, data, target? })` / `chunkText(text, { coalesceMs, target? })`
- Cancellation:
  - `stream.abortSignal` aborts when the client disconnects, and can also be aborted by server code
    (see “Stop/Pause” below).

### QoS (priority + coalescing/dropping)

Streams support a lightweight QoS envelope:

```ts
const stream = c.var.fx.streamClient("ai-tokens", {
  qos: { lane: "bulk", key: "ai-tokens", drop: true },
})
```

- `lane`: `"canonical" | "interaction" | "bulk"`
  - `canonical` = CQRS/self-heal patches
  - `interaction` = replies/toasts
  - `bulk` = token/frame-like streams
- `key + drop`: for bulk streams, newer messages with the same key can replace queued ones
  (useful for “drop frames when lagging”).

Honostar’s SSE endpoint schedules writes so `canonical` updates can’t be starved by a high-volume stream.

## Client API

The runtime installs stream watchers automatically (included in the minimal bootstrap).

It exposes:

```ts
window.Honostar.streams.subscribe(streamId, (event) => {
  // event.type: "open" | "chunk" | "close" | "error"
})
```

### Targeted chunk application (no custom JS required)

Stream chunks can optionally include a `target` object. When present, the runtime can apply the chunk
directly without re-rendering HTML.

Supported targets:

- Append/replace a signal:
  - `{ signal: "_tokens", mode: "append" }`
- Append/replace an element’s `textContent`:
  - `{ selector: "#log", mode: "append" }`

This powers “AI tokens streaming into a `<pre>`” without building DOM patches.

## Stop/Pause (tab-scoped)

For tab-scoped streams, Honostar supports aborting a stream by ID (when the bus supports it):

```ts
c.var.bus.abortClientStream?.(c.var.clientId, "bad-apple")
```

The default `MemoryBus` implements this. Distributed buses may need their own implementation.

## Examples in the starter app

- Bad Apple ASCII:
  - Page: `apps/starter/src/pages/examples/bad_apple/index.tsx`
  - Start/Pause/Stop endpoints:
    - `apps/starter/src/pages/examples/bad_apple/start.ts`
    - `apps/starter/src/pages/examples/bad_apple/pause.ts`
    - `apps/starter/src/pages/examples/bad_apple/stop.ts`
- Bad Apple raster (base64 JPEG):
  - Page: `apps/starter/src/pages/examples/bad_apple/raster/index.tsx`
  - Start/Pause/Stop endpoints:
    - `apps/starter/src/pages/examples/bad_apple/raster/start.ts`
    - `apps/starter/src/pages/examples/bad_apple/raster/pause.ts`
    - `apps/starter/src/pages/examples/bad_apple/raster/stop.ts`
- AI token stream:
  - Page: `apps/starter/src/pages/examples/ai_tokens/index.tsx`
  - Start/Stop:
    - `apps/starter/src/pages/examples/ai_tokens/start.ts`
    - `apps/starter/src/pages/examples/ai_tokens/stop.ts`

## Notes / future work

- **Per-request streaming** (e.g. POST that streams immediately) is not standardized yet; the current
  primitive is focused on multiplexing over the main SSE connection.
- **Workers + Durable Objects**: the stream API is intended to remain stable; the backing transport can
  move to DO-managed connections later.
