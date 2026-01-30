# Architecture Decisions (Living Notes)

This document captures the “why” behind Honostar’s core architecture. It is intentionally opinionated.

## Server Authority (Source of Truth)

- **The server is the source of truth** for shared application state.
- The UI self-heals by re-rendering canonical HTML on the server and patching it into the DOM.
- Client-side signals/state are allowed, but should be treated as **ephemeral UI state**, not persistence.

## CQRS: Commands vs Queries

Honostar uses a CQRS-style split:

- **Commands** mutate state (usually the DB) and then **publish a domain event**.
- **Queries** are pure-ish renderers: given the current server state (and optionally the event), they return **effects** (usually region patches) that update subscribers over SSE.

### Why this split exists

- It makes the SSE stream the “truth channel”.
- It enables self-heal: reconnects or missed events can be corrected by re-running the query and sending a fat patch.
- It keeps business logic (mutations) separate from UI composition (rendering).

## Replies vs Publish vs Broadcast

These are different tools with different semantics:

- `reply(...)` is **client/tab-scoped**: toasts, validation errors, closing a modal in the initiating tab, etc.
- `publish(...)` emits a **domain event**: triggers queries on subscribers to re-render canonical UI.
- `broadcast(...)` sends **effects directly** to all subscribers of a topic (typically avoided for canonical UI; queries are preferred).

Rule of thumb:

- Shared state change → `publish(...)` (queries produce canonical patches).
- Local UX feedback → `reply(...)`.

## Optional Optimistic UI (Supported, Not Required)

Honostar does **not require** optimistic updates. The default mental model is:

1. Command writes to DB
2. Command publishes a domain event
3. Queries re-render canonical HTML from DB

However, apps may choose to add **client-scoped optimistic UI** when latency is noticeable:

- Send an optimistic patch via `reply(...)` to the initiating tab (fast path).
- Still publish the domain event.
- The query’s canonical “fat patch” will overwrite/confirm the optimistic UI when it runs (slow path).

Guidelines for optimistic UI:

- Keep optimistic patches **tab-scoped** (never broadcast guesses).
- Prefer optimistic UI that is easy to overwrite (e.g. “pending…” row, disabled button, spinner, toast).
- Prefer canonical queries that send **fat patches** (`inner` / `replace` / `outer`) so reconciliation is guaranteed.

If the DB mutation fails:

- Return an error `reply(...)` (toast, re-enable button, remove placeholder).
- Do **not** publish.

## Observable HTML (Regions)

Instead of stringly-typed selectors, Honostar encourages patching **named regions**:

- Pages declare stable `RegionId`s.
- Effects patch by region ID (`patch-region`) and are compiled to Datastar’s selector patch at the edge.
- Server enforces “fat patch discipline” by default and warns on incremental patch modes unless explicitly allowed.

This is a safety/ergonomics feature:

- Region IDs are stable across refactors.
- Patch policies become an API surface (instead of “hope this selector works”).

## Typed Topics + Event Contracts

Events are first-class and typed end-to-end:

- Contracts define `(topic, event, schema)`.
- On `publish` and on `receive`, the server validates payloads in dev-mode (configurable).
- Contracts can be used to generate a small `contracts.generated.ts` file for derived type aliases.

Core goals:

- Autocomplete and type-safety for event names/payloads.
- Dev-time enforcement and visibility of contract violations.
- A single registry as the “product surface” for the event bus.

## Topic Subscription Security

In production, clients must not be able to subscribe to arbitrary SSE topics.

Honostar uses an HMAC-signed allowlist token:

- Server signs the allowed topics list and sets it as an HttpOnly cookie (and/or per-request token).
- SSE endpoint verifies the token before subscribing to requested topics.
- In development, missing secrets can disable enforcement for local DX (with warnings).

## Bus Backends (Memory / Redis / NATS)

Honostar is bus-agnostic:

- **MemoryBus**: single-process development, simplest.
- **RedisBus / NatsBus**: multi-instance fanout.

The CQRS model stays the same regardless of the bus backend.
