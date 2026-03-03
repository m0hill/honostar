# HonoStar

A runtime-agnostic meta-framework for building hypermedia-driven web applications with real-time updates. Built on [Hono](https://hono.dev) and [Datastar](https://data-star.dev).

## Philosophy

HonoStar embraces **server-rendered HTML as the source of truth**. Every navigation is a real link, every state change happens on the server, and real-time updates flow through Server-Sent Events (SSE). No client-side sync engines—just declarative HTML that self-heals. Optimistic UI is supported as an optional, tab-scoped layer, but canonical state always comes from the server.

- **Multi-Page App (MPA)**: Traditional navigation with progressive enhancement via View Transitions
- **Server Authority**: All mutations happen server-side; the server re-renders and broadcasts canonical HTML
- **Real-Time SSE**: Live updates via SSE patches morph DOM without full page reloads
- **Declarative Reactivity**: Datastar signals for ephemeral UI state, `data-*` attributes for behavior
- **Fat Patches**: Broadcast entire regions so clients self-heal after missed events or reconnects

## Key Features

### 🎯 Zero-Config Hypermedia MPA

- File-based routing (`src/pages/`) with Next.js-style conventions
- Type-safe route helpers with automatic parameter extraction
- SSE event bus for real-time updates (in-memory, Redis, or NATS)
- Built-in CSRF protection and CSP with nonce support

### 🔄 Declarative Real-Time Updates

- **Replies** (`c.var.fx.reply()`) - Tab-scoped updates for validation errors, toasts, modal state
- **Domain events** (`c.var.fx.publish(topic, name, payload)`) - Commands publish; queries re-render fat patches on SSE
- **Fat patches** - Re-render entire regions so clients self-heal after reconnects

### 🎨 Modern DX

- Hono JSX for server-side rendering
- shadcn/ui components pre-converted for Hono JSX
- Theme system with zero-FOUC server/client coordination
- Runtime-agnostic: works with Node.js, Bun, Deno

### 🔐 Security Built-In

- CSRF token validation with configurable exemptions
- CSP with per-request nonces
- SSE topic signing to prevent unauthorized subscriptions
- HMAC-based topic authorization (zero shared state)

## Quick Start

```bash
# Install dependencies (workspace)
pnpm install

# Run the minimal starter app
pnpm dev

# Run the full demo app
pnpm dev:demo

# Open http://localhost:3000
```

## Maintainers

Implementation / commenting standards live in `docs/IMPLEMENTATION.md`.

## Docs

- `docs/BUILD.md` - Build system (Vite/tsc) and asset pipeline
- `docs/STREAMING.md` - Streaming as a first-class primitive (multiplexed over `/_/events`)
- `docs/CUSTOM_EFFECTS.md` - Extending the effect system
- `docs/COMMANDS_QUERIES_COOKBOOK.md` - Command/query patterns and realtime CQRS recipes
- `docs/PREFETCH.md` - Prefetch behavior
- `docs/DECISIONS.md` - Architecture decisions
- `docs/VISION.md` - Product vision / roadmap

## Core Concepts

### Pages & Handlers

**Pages** render full HTML documents:

```typescript
// src/pages/issues.tsx
export default defineQueryPage({
  use: [requireAuth], // Optional middleware
  loader: async (c) => ({
    issues: await fetchIssues(c)
  }),
  component: (props) => <IssuesList issues={props.issues} />,
  topics: [topics.issues.list()], // Auto-subscribe to SSE topic
  queries: [[topics.issues.list(), issuesListQuery]], // Re-render on domain events
})
```

**Handlers** (commands) mutate state and publish domain events:

```typescript
// src/pages/issues.tsx
export const POST = defineCommand({
  use: [requireAuth],
  async handler(c) {
    const input = await c.req.json()
    const issue = await createIssue(input)

    // CQRS: publish domain event; queries re-render subscribed regions.
    c.var.fx.publish(topics.issues.list(), "issue:created", { id: issue.id })

    return c.var.fx.reply([["patch-signals", { modal: { open: false } }]])
  },
})
```

### Replies vs Domain Events

| Use                             | When                                            | API                                                 |
| ------------------------------- | ----------------------------------------------- | --------------------------------------------------- |
| `reply()`                       | Tab-scoped feedback (validation errors, toasts) | Targets the initiating tab only                     |
| `publish(topic, name, payload)` | Shared state changes (create/update/delete)     | Fans out an event; queries re-render canonical HTML |

**Rule**: Every shared state change must publish through a topic defined in `src/lib/topics.ts`.

Tip: use `c.var.isDatastarRequest` (or `isDatastarRequest(c)`) instead of manual header checks.

`reply()` now inspects the incoming request and, when it comes from a Datastar action, automatically returns HTTP patches for simple built-in effects (`patch-elements`, `patch-elements-seq`, `patch-signals`). The response includes the required `datastar-*` headers so the client can morph the DOM without needing an SSE connection. More complex replies (custom effects, execute-script, multi-effect responses) continue to use SSE just like before.

### SSE Patch Discipline

```typescript
// ✅ Good: Query returns a fat patch (default outer morph)
export const issuesListQuery: QueryHandler = async ({ c }) => {
  const allIssues = await fetchIssues(c)
  return [['patch-elements', <IssuesList issues={allIssues} />]]
}

// ✅ Good: Append modal to overlay container
c.var.fx.reply([
  ['patch-elements', <Modal />, { selector: '#ds-overlays', mode: 'append' }]
])

// ❌ Bad: Redundant explicit mode
['patch-elements', component, { mode: 'outer' }] // Remove mode option
```

**Fat Patches Principle**: Send entire regions (lists, tables, cards) so clients can self-heal after missed events or reconnects. Avoid incremental `append`/`prepend` unless absolutely necessary (infinite scroll, chat).

### Region Authoring (Standard)

Use region APIs consistently:

- Render patch targets with `Region` or `regionAttrs(...)`
- Patch with `patchRegion(...)` / `patchRegionSeq(...)`
- Prefer region IDs over raw selector strings

In dev, HonoStar warns when `patch-elements` targets a region-like selector that is not registered.

### Datastar Attributes

HonoStar uses Datastar's declarative attribute API:

```tsx
<form
  data-on:submit="@post('/issues', { contentType: 'json' })"
  data-signals:creating="false"
  data-indicator:creating.class.opacity-50="creating"
>
  <input data-bind:title type="text" />
  <button type="submit">Create Issue</button>
</form>

<div
  id="issues-list"
  data-show="$issuesLoaded"
  style="display:none"
>
  {/* Server renders this, SSE morphs it on updates */}
</div>
```

**Key Rules**:

- Signals are ephemeral UI state, never persistence
- `data-computed` must be pure (use `data-effect` for side-effects)
- `data-show` requires `style="display:none"` to prevent FOUC
- Indicators must come before `data-init` so signals exist before requests start

## Configuration

Zero-config works out of the box. Override via `HonostarConfig`:

```typescript
// src/index.ts
const config = {
  assets: {
    css: "/styles.css",
    runtime: "/runtime.js",
    datastar: "/datastar.js",
  },
  endpoints: { sse: "/_/events" },
  security: {
    csp: "script-src 'self' 'unsafe-eval' 'nonce-${nonce}';",
    csrf: {
      cookieName: "ds_csrf",
      exceptPaths: ["/webhooks"],
    },
    topics: {
      secretEnv: "HONOSTAR_SIGNING_SECRET", // Required in production
      maxAgeSec: 300,
    },
  },
}

app.use("*", csrf(config))
app.use("*", renderer(config))
app.get("/_/events", createSseEndpoint(config))
```

### Vite asset pipeline (recommended)

In the starter/demo apps, browser assets are built with Vite into `dist/` (hashed filenames under `dist/assets/`), and served at `/assets/*`.

Apps use `dist/manifest.json` to resolve the hashed URLs, so you don’t need to hardcode:

- `assets/runtime-<hash>.js`
- `assets/styles-<hash>.css`

Use the `honostar` CLI (`pnpm dev`, `pnpm dev:demo`) so the manifest exists before the server starts.

Details: `docs/BUILD.md` (includes the recommended `createConfig({ assets: ... })` pattern).

## Multi-Instance Scaling

HonoStar supports horizontal scaling via Redis or NATS for distributed SSE:

```bash
# Option 1: NATS (checked first)
export NATS_URL="nats://localhost:4222"
# Or Honostar-specific
export HONOSTAR_NATS_URL="nats://user:pass@host:4222"

# Option 2: Redis (checked second)
export REDIS_URL="redis://localhost:6379"
# Or Honostar-specific
export HONOSTAR_REDIS_URL="redis://user:pass@host:6379"
```

**Bus Priority**: NATS → Redis → MemoryBus (in-process fallback)

All three implementations satisfy the same `PubSubBus` interface, so your application code remains identical regardless of which bus is active.

## Type-Safe Routing

Routes are auto-generated from `src/pages/` file structure:

```typescript
import { routes } from '@/routes'

// Type-safe links
<a href={routes.issues.href()}>All Issues</a>
<a href={routes.issues.id.href({ id: 123 })}>Issue #123</a>

// In handlers
return c.redirect(routes.issues.id.href({ id: created.id }))
```

Route manifest regenerates automatically on dev/build.

## No Optimistic Updates, No Sync Engine

HonoStar's architecture eliminates the complexity of client-side state synchronization:

- **Server renders canonical HTML** - The server is the single source of truth
- **SSE broadcasts patches** - Clients receive morphing instructions, not raw data
- **Fat patches self-heal** - Missed events don't cause drift; next patch includes full state
- **No reconciliation logic** - Datastar morphs DOM; no React-style diffing or manual sync

This means:

- No "loading → optimistic → actual" state juggling
- No conflict resolution or rollback logic
- No client-side caching/invalidation strategies
- Clients are always eventually consistent with server state

## Architecture

```
src/
├── core/                  # Framework internals
│   ├── router/           # File-based routing + manifest generator
│   ├── datastar/         # SSE bus, responders, formatters
│   ├── security/         # CSRF, CSP, topic signing
│   └── runtime/          # Client-side runtime (theme, modals, etc.)
├── pages/                # Routes (auto-discovered)
├── components/           # Reusable UI components
│   └── ui/              # shadcn/ui (Hono JSX)
├── middleware/           # App middleware (auth, bus, db)
└── lib/                  # Utilities, topics, auth
```

## Runtime Compatibility

HonoStar runs on any platform supported by Hono:

- ✅ **Bun** (recommended for development)
- ✅ **Node.js** (v18+)
- ✅ **Deno**
- ✅ **Cloudflare Workers**
- ✅ **Vercel Edge**
- ✅ **AWS Lambda**

## Documentation

Docs in this folder:

- `docs/BUILD.md` — Vite pipeline, manifest-based asset resolution, Tailwind via Vite plugin, CLI behavior.
- `docs/DECISIONS.md` — “why” behind architecture decisions.
- `docs/VISION.md` — long-term direction and product bets.
- `docs/IMPLEMENTATION.md` — implementation/commenting standards.
- `docs/DOCUMENTATION.md` — deeper framework guide (concepts, patterns, gotchas).
- `docs/CUSTOM_EFFECTS.md` — custom effect authoring.
- `docs/PREFETCH.md` — smart prefetching behavior.
- `docs/datastar-docs/` — upstream/reference material and notes.

Engineering guidelines for contributing live in `AGENTS.md` at the repo root.

## License

MIT
