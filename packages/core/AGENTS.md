# packages/core

## OVERVIEW

3-tier modular core for reactive web apps with SSE, type-safe routing, and runtime client plugins

## WHERE TO LOOK

**server/**: Routes, SSE endpoints, effects, middleware, security (csrf/topics), pubsub buses
**client/**: Runtime plugins (fetch, focus, image, modals), prefetch, theme controller
**common/**: Shared types (Jsonifiable, Datastar events), constants, theme providers

## CONVENTIONS

- Type-safe route builder: `route({ issues: '/issues/:id' })` with compile-time param enforcement
- SSE protocol: Server → client via Datastar events (patch-elements, patch-signals)
- Effect system: Server effects registered with fxResponder, dispatched through PubSubBus
- Bus abstraction: Memory (dev), Redis, NATS for production pubsub
- Factory middleware: `factory.createMiddleware((c, next) => {})` for context injection
- Theme resolution: Cookie → provider fallback with CSP nonces
- CQRS pattern: Queries registered per topic, run on connect + event replay

## ANTI-PATTERNS

Never import client code in server tier or vice versa. Don't bypass fxResponder for SSE writes. No non-Jsonifiable payloads in events. Don't skip topic verification in prod.
