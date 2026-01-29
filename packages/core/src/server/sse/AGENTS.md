# OVERVIEW

Server-Sent Events (SSE) layer: PubSub bus, effect registry, CQRS queries, endpoint, and responder for real-time DOM patches.

# STRUCTURE

- `pubsub/` - Memory, Redis, NATS bus implementations (PubSubBus interface)
- `endpoint.ts` - SSE connection handler (topic verification, replay, heartbeats)
- `responder.ts` - FxResponder (reply/broadcast/publish via c.var.fx)
- `effect-registry.ts` - Extensible effect handlers
- `queries.ts` - CQRS TopicQueryRegistry (exact/RegExp patterns)
- `generator.ts` - SseFormatter (Datastar event serialization)
- `middleware.ts` - fxResponder middleware, registerEffect/registerQuery helpers

# WHERE TO LOOK

- PubSub: `pubsub/memory.ts:14-30` (PubSubBus interface), `pubsub/memory.ts:58-144` (MemoryBus)
- Effect registry: `effect-registry.ts:45-122` (EffectRegistry)
- Queries: `queries.ts:20-61` (TopicQueryRegistry)
- Endpoint: `endpoint.ts:103-306` (createSseEndpoint)
- Responder: `responder.ts:55-554` (FxResponder)

# CONVENTIONS

- PubSub buses: use retained patches only for idempotent modes (outer/inner/replace), not append/prepend
- Queries: run on connect and when domain events arrive; return fat patches
- Write chain: serialize SSE writes via promise chain for deterministic ordering
- Transport optimization: HTTP reply for single Datastar effect, else SSE via bus

# ANTI-PATTERNS

- Mixing append/prepend with retained patches (not idempotent)
- Directly patching DOM from query handlers (use effects instead)
- Skipping topic verification in production (allows unauthorized subscriptions)
- Bypassing write chain (breaks ordering guarantees)
