# Transport and Runtime Design

HonoStar uses a hybrid transport strategy for effects:

- HTTP patch reply when safe and immediate
- SSE fanout for shared and/or complex effect delivery

## Why hybrid transport

Not every interaction needs the same path:

- tab-scoped immediate feedback is fastest over the active HTTP response
- shared updates need topic fanout and query orchestration over SSE

HonoStar chooses transport based on response shape and scope.

## HTTP patch optimization

For Datastar requests, if reply contains exactly one built-in patch effect:

- `patch-elements`
- `patch-elements-seq`
- `patch-region`
- `patch-region-seq`
- `patch-signals`

HonoStar returns direct HTTP with `datastar-*` headers.

This avoids waiting for SSE roundtrip for common local updates.

## SSE as truth channel

SSE carries:

- canonical query re-renders triggered by published domain events
- fanout to multiple subscribers
- retained replay recovery
- stream primitives (open/chunk/close/error)

This centralizes shared truth propagation.

## Runtime layering

Server renderer emits runtime data blob (assets, csrf, theme, devtools config).

Client bootstrap then installs:

- fetch augmentation (`X-Tab-ID`, CSRF)
- theme actions/controller
- stream watchers
- optional prefetch/plugins/inspector in standard bootstrap

The runtime enhances navigation and interaction but does not replace server ownership of shared state.
