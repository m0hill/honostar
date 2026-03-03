# SSE and Effects Protocol

Technical reference for HonoStar's SSE layer.

## Endpoint

Default SSE endpoint: `/_/events`.

Factory:

```ts
createSseEndpoint(config?, { queries? })
```

## Connection behavior

On connect:

1. Requires non-anonymous `clientId` (from `X-Tab-ID`).
2. Subscribes to client channel.
3. Verifies requested topics via signed token (query/header/cookie fallback order).
4. Runs initial query for subscribed topics when query exists.
5. Else, replays retained patch if available.
6. Emits heartbeat `ping` events (`sse.pingIntervalMs`).

Probe mode:

- `GET /_/events?__honostar_probe=1` returns `204` with `x-honostar-sse: ok`.

## Incoming topic parameters

Query params consumed by SSE endpoint:

- `topics`: comma-separated topic list
- `topicsToken`: optional per-request topic token
- `datastar`: reserved

Other query params are forwarded as `sseParams` for shared query keying.

## Domain event transport

`publish(...)` writes `honostar-event` messages:

```json
{
  "event": "honostar-event",
  "name": "issue:created",
  "payload": "{\"id\":123}"
}
```

SSE endpoint resolves query handlers for the topic and emits resulting effects.

## SSE payload event types

Bus payload union includes:

- `datastar-patch-elements`
- `datastar-patch-signals`
- `execute-script`
- `honostar-event`
- `datastar-honostar-stream-open`
- `datastar-honostar-stream-chunk`
- `datastar-honostar-stream-close`
- `datastar-honostar-stream-error`
- `close`

## Effect compilation

Query/response effects are compiled into Datastar SSE events:

- `patch-elements` / `patch-elements-seq` -> `datastar-patch-elements`
- `patch-region` / `patch-region-seq` -> `datastar-patch-elements` via region selector resolution
- `patch-signals` -> `datastar-patch-signals`
- `execute-script` -> execute script event

`close-sse` closes the stream.

## QoS scheduling

Messages can carry QoS:

- `lane`: `canonical | interaction | bulk`
- `key`: dedupe key
- `drop`: drop/replace queued bulk messages with same key

Queue priority order per connection:

1. `canonical`
2. `interaction`
3. `bulk`

Bulk buffering is bounded to avoid unbounded memory growth.

## Retained patches

Buses may retain last idempotent `datastar-patch-elements` per topic.

Retained eligibility:

- patch mode `outer`, `inner`, or `replace`
- incremental modes are excluded

Purpose:

- immediate self-heal on reconnect when no fresh event is published yet

## Shared query coalescing

When query options include `{ shared: true }`, HonoStar can coalesce execution/render across subscribers per process/instance.

- default cache window: `250ms`
- key includes topic, event metadata, match, and shared SSE params unless custom key function is provided
