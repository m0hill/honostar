# AGENTS.md

## OVERVIEW

HonoStar — runtime-agnostic meta-framework for hypermedia-driven web applications with real-time updates via SSE. Built on Hono and Datastar. Server-authoritative CQRS architecture: commands publish domain events, queries re-render fat patches, clients self-heal.

## STRUCTURE

```
packages/
  core/          # @honostar/core - Framework (server + client runtime)
  inspector/     # @honostar/inspector - Devtools UI
  standard/      # @honostar/standard - Curated client bootstrap
  logging/       # @honostar/logging - Structured logging utilities
apps/
  starter/       # Minimal starter app (recommended starting point)
  demo/          # Full example app with DB/auth
docs/            # Framework docs, implementation standards
```

## WHERE TO LOOK

**Framework core**: `packages/core/src/server/` (router, SSE, security, effects), `packages/core/src/client/` (runtime plugins, prefetch, theme)
**App structure**: `apps/*/src/pages/` (file-based routing), `components/` (shadcn/ui), `lib/` (topics, utilities, middleware)
**PubSub bus**: `packages/core/src/server/sse/pubsub/` (Memory/Redis/NATS implementations)
**Route generator**: `packages/core/src/server/router/generator.ts`

## CODE MAP

| Location                                    | Purpose                                                 |
| ------------------------------------------- | ------------------------------------------------------- |
| `packages/core/src/server/page.ts`          | `defineQueryPage`, `defineCommand` factories            |
| `packages/core/src/server/sse/endpoint.ts`  | SSE endpoint creation with topic validation             |
| `packages/core/src/server/sse/responder.ts` | Effect registration (`registerEffect`, `registerQuery`) |
| `packages/core/src/server/renderer.tsx`     | HTML renderer with CSP/CSRF/theme injection             |
| `packages/core/src/server/router/`          | File-based routing + manifest generation                |
| `packages/core/src/client/runtime/`         | Runtime plugins (fetch, focus, image, modals)           |
| `packages/core/src/client/prefetch.ts`      | Smart link prefetching                                  |

## CONVENTIONS

**CQRS pattern**: Commands mutate state + publish domain events via `c.var.fx.publish(topic, name, payload)`. Queries registered via `registerQuery` re-render on events. Pages declare `topics` (auto-subscribe) and `queries` (event→query mapping).
**Fat patch discipline**: Query handlers return entire regions (`patch-elements` default mode) so clients self-heal after missed events/reconnects. Avoid `append`/`prepend` unless necessary.
**Reply vs broadcast**: `c.var.fx.reply()` for tab-scoped feedback (validation errors, toasts). `c.var.fx.publish()` for shared state changes.
**Type-safe routing**: Routes generated from `src/pages/` file structure. Use `routes.*.href({ id })` for links/redirects. Regenerate on dev/build.
**SSE protocol**: Server sends Datastar events (`patch-elements`, `patch-signals`). Client morphs DOM.
**Bus abstraction**: Memory (dev) → Redis → NATS (priority order). Same `PubSubBus` interface everywhere.
**Theme resolution**: Cookie → provider fallback with CSP nonce support.
**Factory middleware**: Use `factory.createMiddleware((c, next) => {})` for context injection.
**Testing**: `bun test` for packages. Tests verify semantically correct behavior (failing tests OK if they expose bugs).

## ANTI-PATTERNS

Never bypass `fxResponder` for SSE writes. No non-JSONifiable payloads in events. Don't skip topic verification in prod. Never import client code in server tier or vice versa. Don't use `any`, `!`, or type assertions. No optimistic updates or client-side sync engines.

## COMMANDS

```bash
pnpm install          # Install workspace deps
pnpm dev              # Run starter (localhost:3000)
pnpm dev:demo         # Run demo app
pnpm build            # Build all packages
pnpm typecheck        # Type check all
pnpm lint             # Lint all
pnpm format           # Format with oxfmt
pnpm check            # format + lint + typecheck + test
pnpm routes:generate  # Regenerate routes (in app dirs)
```

## NOTES

- Bun recommended for dev, Node.js v18+ supported. Also runs on Deno, Cloudflare Workers, Vercel Edge, AWS Lambda.
- Docs: `docs/README.md` (framework), `docs/IMPLEMENTATION.md` (commenting standards), `docs/VISION.md` (product roadmap).
- Pre-commit hooks run lint-staged (oxfmt + oxlint).
- Security: CSRF default, CSP with nonces, HMAC topic signing. Set `HONOSTAR_SIGNING_SECRET` in production.

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
