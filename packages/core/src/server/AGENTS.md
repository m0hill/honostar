## OVERVIEW

Core server runtime providing Hono middleware, effect system, SSE streaming, CQRS routing, and security layers

## WHERE TO LOOK

- Effect system: `sse/effect-registry.ts` (registry, custom effects), `sse/middleware.ts` (fx responders, effect registration)
- SSE: `sse/endpoint.ts` (connection lifecycle, topic verification), `sse/pubsub/` (bus implementations: memory, redis, nats)
- Security: `security/topics.ts` (HMAC-signed topic allowlists), `security/csrf.ts` (token validation)
- Routing: `router/index.ts` (mountRoutes, page handlers), `route.ts` (type-safe route builders)
- Config: `config.ts` (security policies, CSP, asset paths, devtools)

## CONVENTIONS

- Handlers return concrete `Response` values (use `c.var.fx.reply()/broadcast()/ok()` for effects)
- Topic subscriptions require `signTopics()` before `verifyTopics()` enforces allowlist
- Custom effects registered via `registerEffect()` middleware with `EffectHandler<Args>` type
- SSE writes serialized through promise chain to maintain event ordering

## ANTI-PATTERNS

- Don't return non-`Response` values from handlers
- Don't skip `verifyTopics()` in SSE - bypasses allowlist enforcement
- Don't mix direct `c.render()` calls with `fx` responders in same handler path
- Don't use synchronous writes to SSE stream - breaks promise chain ordering
- Don't subscribe to arbitrary topics without `signTopics()` - allows unauthorized access
