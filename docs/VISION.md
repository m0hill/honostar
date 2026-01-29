# HonoStar Vision (Big Ideas)

This document is intentionally ambitious. It’s the “if HonoStar was my baby project” roadmap: the big bets, the product direction, and the technical north star.

## The North Star

Make **server-rendered HTML + events** feel as powerful (and more reliable) than SPA state management.

If we get this right, the default way to build apps becomes:

- Render the page on the server (canonical truth)
- Mutations publish domain events
- Queries re-render _fat patches_ over SSE (self-healing UI)
- Client JS is mostly progressive enhancement + ergonomics (not state ownership)

## What Makes HonoStar Unique (Keep This Sacred)

- **Server authority**: client state is ephemeral; shared state is always server truth.
- **Fat patches**: broadcast whole regions to auto-heal on reconnect/missed events.
- **CQRS you can actually use**: commands publish, queries re-render, pages subscribe.
- **Hypermedia-first**: real links, real forms, real URLs—JS upgrades, doesn’t replace.
- **Operational simplicity**: correctness beats cleverness; degrade gracefully.

## Packaging Philosophy (Where We’re Heading)

The best ecosystem shape is a small “core” plus optional batteries:

- `@honostar/core` — server + core client runtime primitives (minimal, stable).
- `@honostar/inspector` — devtools UI and debugging instrumentation.
- `@honostar/standard` — a curated “recommended” client bootstrap.

Future likely splits (only if they pay rent):

- `@honostar/bus-redis`, `@honostar/bus-nats` — optional runtime bus adapters + docs.
- `@honostar/prefetch` — prefetch as a standalone utility.
- `@honostar/theme` — theming as a reusable module.
- `@honostar/cli` — scaffolding + codegen + upgrade tooling.

## Big Product Ideas

### 1) “Observable HTML” (first-class patch regions)

Let pages declare named regions and patch rules:

- regions have stable IDs + semantics (list/table/card)
- queries return `{ region: 'issues:list', html: ... }` not raw selector strings
- server enforces “fat patch discipline” by default (warn on append/prepend unless allowed)

This turns DOM patching from “stringly-typed selectors” into a real API.

### 2) Typed Topics + Event Contracts

Make topics and event names typed end-to-end:

- `topic('issues:list').event('issue:created', schema)`
- server validates payload (dev-mode) and logs contract violations
- generate TS types for clients/tools from a single registry

This makes the “event bus” feel like an actual product surface, not an implementation detail.

### 3) Time-Travel Debugging for Hypermedia

The killer devtools feature:

- record a session’s events (domain events + replies)
- replay them deterministically against the same page rendering code
- diff the resulting HTML patches across versions (regression detector)

This is “Redux devtools” but for server-rendered hypermedia and SSE patches.

### 4) Deterministic Re-rendering & Snapshot Tests

Provide a testing mode where:

- pages are rendered with a deterministic clock/random
- queries return stable HTML (normalized whitespace/attributes)
- snapshot tests validate the exact patch output for given events

This makes “fat patches” safe at scale: changes become auditable.

### 5) Distributed Correctness by Default

Make “multi-instance” a first-class story:

- topic signing + allowlists are non-negotiable in production
- retention/self-heal behavior is consistent (Memory/Redis/NATS)
- optional durable event log integration (future) without forcing it on everyone

The pitch: **scale out without rewriting your UI model**.

### 6) “Boring” but World-Class DX

- `honostar dev` runs:
  - route manifest generation (watch mode)
  - client runtime bundling
  - server reload
  - inspector auto-enable in dev
- prebuilt starter templates:
  - minimal (no DB)
  - full-stack (db/auth)
  - multi-instance (redis/nats)

### 7) Opinionated Security Defaults

Be the framework that makes secure-by-default easy:

- CSP with nonces (and “no unsafe-inline” by default)
- CSRF as default middleware
- topic tokens signed and short-lived
- explicit escape hatches with loud warnings

## Big Technical Ideas

### A) Patch Semantics Layer

Standardize effects as a semantic model, not just Datastar wire format:

- `ReplaceRegion('issues:list', <IssuesList />)`
- `Toast('Saved')`
- `OpenModal(<Dialog />)`

Then compile down to Datastar patches or SSE payloads. This unlocks:

- alternative clients later (or multiple patch transports)
- server-side validation of “safe” operations

### B) Hybrid “Reply vs Broadcast” Optimization

Keep the current design, but push it further:

- tab-scoped replies can return immediate HTTP patches (no SSE requirement)
- broadcasts go through the bus
- the same effect description can choose the best transport automatically

The goal: **SSE is for shared truth; replies are for instant UX**.

### C) Edge Runtime Strategy

If we want “forever impact”, we need an edge story:

- Node/Bun: full features
- Edge/Workers: limited mode (no long-lived SSE in some contexts, or use WebSockets gateway)
- provide “adapter packages” with explicit capability matrices

## Suggested Near-Term Roadmap (Concrete)

1. Stabilize package boundaries (`core` / `inspector` / `standard`) and publish alpha tags.
2. Add a small CLI:
   - `honostar new`
   - `honostar routes --watch`
   - `honostar check` (typecheck + lint + route gen)
3. Typed topics registry + event contract validation in dev.
4. Inspector improvements:
   - show “who patched what” (source page/query)
   - event filtering by topic/name
   - export/import captured sessions
5. Documentation cleanup:
   - “core vs standard” guide
   - “fat patch discipline” and anti-patterns

## The “Forever” Bet

If HonoStar changes web dev, it’ll be because it proves:

You can have **real-time, reactive UX** without shipping a client-side state machine.

If we can make that feel _obviously better_ (simpler, more secure, more reliable), people will copy it.
