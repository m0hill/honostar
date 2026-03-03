# FX Responder API

Reference for `c.var.fx` (`FxResponder`).

## Core methods

### `reply(effects, options?)`

Send effects to the initiating tab (`toClient: true`).

- For Datastar requests with exactly one built-in patch effect, HonoStar returns an HTTP patch response with `datastar-*` headers.
- Otherwise effects are delivered through SSE to the client channel.

### `ok(options?)`

Shortcut for `reply([])`.

Use when command publishes domain events and does not need local UI effects.

### `broadcast(topicOrTopics, effects, options?)`

Send effects to subscribers of one or more topics.

Use sparingly for canonical state; prefer `publish(...)` + query re-rendering.

### `publish(topicOrTopics, eventName, payload?)`

Publish a domain event (`honostar-event`) to topics.

- Validates contracts (when registered/configured).
- Does not patch DOM directly.

Overload:

- `publish(contract, payload)`

### `publishTo(topicOrTopics, contract, payload)`

Publish using contract event/schema to explicit topic(s).

Useful for pattern contracts where concrete topic string is provided at call site.

## Region helpers

- `replyRegion(region, html, options?, response?)`
- `replyRegionSeq(region, htmlList, options?, response?)`
- `broadcastRegion(topicOrTopics, region, html, options?, response?)`

These wrap `patchRegion`/`patchRegionSeq` effects.

## Legacy convenience methods

- `append(topic, selector, component, signals?)`
- `prepend(topic, selector, component, signals?)`
- `update(topic, component, signals?)`
- `remove(topic, selector, signals?)`
- `removeSignals(topic, keys)`
- `noContent()`
- `fx(topic, effects)`
- `respond(args)`

Prefer modern `reply`/`broadcast`/`publish` + region effects for app code.

## Typed contracts helper

### `withContracts(contracts)`

Returns typed publisher:

```ts
await c.var.fx.withContracts(contracts).publish("issues:list", "issue:created", { id: 1 })
```

## Streaming API

### `stream(target, streamId, opts?)`

Low-level stream primitive for client/topic stream events.

- `target`: `{ to: "client", clientId? }` or `{ to: "topic", topic }`
- `opts.qos`: `{ lane?, key?, drop? }`

Returned `FxStream` methods:

- lifecycle: `open(meta?)`, `close()`, `error(message)`
- chunking: `chunk(...)`, `chunkText(text, { coalesceMs?, target? })`, `flush()`
- direct effects: `signals(...)`, `elements(...)`, `executeScript(...)`

### Convenience wrappers

- `streamClient(streamId, opts?)`
- `streamTopic(topic, streamId, opts?)`

## Built-in effect tuples

- `['patch-elements', jsxOrHtml, options?]`
- `['patch-elements-seq', list, options?]`
- `['patch-region', patch]`
- `['patch-region-seq', patch]`
- `['patch-signals', signals, options?]`
- `['execute-script', script, options?]`
- `['close-sse']`

Custom effect tuples are also supported: `['my:effect', ...args]`.
