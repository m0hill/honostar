# Security Model

HonoStar's security defaults are designed for server-rendered, SSE-connected apps.

## CSRF

`csrf(...)` middleware:

- issues token cookie (`ds_csrf` by default)
- validates unsafe methods
- accepts header token (`X-CSRF-Token` by default)
- allows same-origin fallback for native form submissions (Origin/Referer)

Default exemption includes SSE endpoint path.

## Topic subscription authorization

Without protection, clients could subscribe to arbitrary topic names and potentially observe unauthorized events.

HonoStar mitigates this with signed topic allowlists:

1. renderer signs allowed topics (`signTopics`) and provides token
2. SSE endpoint verifies token (`verifyTopics`)
3. only authorized requested topics are subscribed

Token sources are checked in order: request header/query token, then cookie fallback.

## Event contract validation

Contracts add schema checks for domain events on publish and receive paths.

Modes via `HONOSTAR_EVENT_CONTRACTS`:

- `off`
- `warn`
- `strict`

This is correctness/security-adjacent: malformed payloads are surfaced early.

## CSP and nonce model

Renderer injects a per-request nonce and emits CSP meta tag.

CSP must include `'unsafe-eval'` because Datastar expressions depend on runtime evaluation.

## Security boundary clarity

- Signals are client-editable; do not treat as trusted input.
- Commands must re-validate inputs server-side.
- Topic names should include tenant/user scoping when needed.
