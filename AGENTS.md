# Bonsai Engineering & Agent Guide

This is the canonical playbook for any human or AI engineer working on Bonsai. The rules below reflect production constraints and Datastar best-practices—follow them exactly unless product requirements explicitly say otherwise.

---

## 1. Mental Model: Hypermedia MPA + Datastar

- We ship a **server-rendered Multi-Page App**. Every navigation is a normal `<a href>` request returning a fresh HTML document. No client router, no single-page hydration.
- **View Transitions** are progressive enhancement. Simply use real links; the runtime automatically wraps same-origin navigations in `document.startViewTransition()`.
- **The server is the source of truth.** All state mutations happen on the server, which then re-renders canonical HTML and broadcasts as needed.
- **Datastar** powers real-time UX via SSE patches and local signals. Treat signals as ephemeral UI state, never as a persistence layer.

---

## 2. Replies vs Broadcasts

Decide this **before** writing code:

| Use | When | API |
| --- | --- | --- |
| `c.var.datastar.reply()` | Feedback that should only update the initiating tab (validation errors, modal close, toast) | tab-scoped SSE sent to the caller via `X-Tab-ID` |
| `c.var.datastar.broadcast(topic, …)` | Shared state that all viewers must see (new issue/comment/label) | broadcast to a page topic (define topics in `src/lib/topics.ts`) |

Rules:
1. Every shared state change must “fan out” through a **topic** defined in `src/lib/topics.ts`. Never inline topic strings.
2. Use “fat patches”: re-render the entire region you’re updating so missed events can self-heal.

---

## 3. Page & Topic Wiring

1. **Pages** (`createPage`) declare their topics. The renderer automatically subscribes via `<body data-init="@get('/_/events?topics=…')">`.
2. Components that will be patched must expose a **stable root ID** (`id="issues-list"`).
3. SSE responses should target those IDs and use default `outer` morphing unless you’re intentionally appending/prepending list items.

---

## 4. Datastar Attribute Rules

**General**
- Keep expressions pure; no imperative JS outside supported helpers.
- Attribute order matters; data-star runs top to bottom.

**Signals & Expressions**
- `data-signals` overwrites values immediately. `data-signals__ifmissing` only seeds absent signals.
- Keys defined via kebab case become camelCase in expressions (e.g., `data-signals:new-comment` ⇒ `$newComment`).
- Never store secrets/tokens/passwords in signals. They’re user-editable.
- `data-persist` is banned unless you add `include`/`exclude` filters to avoid persisting sensitive keys.

**`data-computed`**
- Pure only (math/formatting). Move side-effects to `data-effect`.

**`data-show`**
- Always add `style="display:none"` to avoid FOUC.

**Forms**
- `data-on:submit` prevents default; wire your action explicitly with `@post('/path', {contentType})`.
- File uploads: choose **one** strategy:
  - Signals (`data-bind` on `<input type="file">`) + JSON payload.
  - Native form submit (`enctype="multipart/form-data"`, `contentType: 'form'`). Never both.

**Indicators & Requests**
- If an element has `data-indicator:*` and `data-init`, order must be `data-indicator` first so the signal exists before the request starts.
- Keep `openWhenHidden: true` for dashboards only—background tabs otherwise pause SSE to preserve battery.

---

## 5. Modals & Overlays

Two supported patterns:
1. **Dialog-based** (legacy): `<dialog data-modal>` handled by `client-runtime`.
2. **Overlay container** (current default): `<div data-modal>` inserted into `#ds-overlays`.

Requirements for any modal:
- Lives under `#ds-overlays` so navigation resets it.
- Uses a dedicated signals namespace (e.g., `$createIssueModal.open`) to avoid cross-modal bleed.
- Backdrop and dialog each use `data-show` with `style="display:none"` to prevent flicker.
- Escape and outside-click close the modal: `data-on:keydown__window="evt.key==='Escape' && ($modal.open=false)"` and `data-on:click__outside`.
- Modal content gets focus via `data-ref="modalEl"` + `data-init`.
- When closing, also remove the DOM node via SSE or `window.Bonsai.modals.close(id)` so inert state clears.

---

## 6. SSE Patch Discipline

**Default Behavior (Recommended)**
- `mode: 'outer'` is the **default** for `patch-elements`. Never specify it explicitly—just omit the `mode` option.
- Use fat patches: `['patch-elements', component]` with no options when possible. Datastar will morph by matching top-level element IDs.

**When to Use Options**
- `{ selector: '#target-id' }` - Required for `append`/`prepend`/`before`/`after`/`remove` modes. Not needed for default `outer` morph.
- `mode: 'append'/'prepend'` - Only for true incremental updates (infinite scroll, chat messages). **Warning**: These are fragile to SSE interruptions. Prefer full region re-renders.
- `mode: 'inner'/'replace'` - Rarely needed. Document why if used.

**Fat Patches Principle**
- When updating lists, send the **entire list markup** so clients can self-heal after missed events or reconnects.
- Each patch root must have an `id`. If you use `selector: '#foo'`, ensure the rendered HTML includes `id="foo"`.

**Example (Correct)**
```typescript
// Good: Default outer morph, no explicit mode
c.var.datastar.broadcast(topic, [
  ['patch-elements', <IssuesList issues={allIssues} />]
])

// Good: Selector required for append mode
c.var.datastar.reply([
  ['patch-elements', <Modal />, { selector: '#ds-overlays', mode: 'append' }]
])

// Bad: Redundant explicit outer mode
['patch-elements', component, { mode: 'outer' }] // ❌ Remove mode
```

---

## 7. CSP & Security

- `src/core/renderer.tsx` already emits `<meta http-equiv="Content-Security-Policy" content="script-src 'self' 'unsafe-eval';">`. Never remove `unsafe-eval`; Datastar expressions rely on `Function()`.
- Sanitize/escape any untrusted HTML strings you interpolate into JSX attributes.
- Never leak credentials or CSRF tokens to the client beyond what `renderer` already exposes via the runtime meta/script.

---

## 8. SSE Events & SDK Methods

**Core Datastar SSE Events** (sent over the wire):
- `datastar-patch-elements` - Morph/patch HTML into the DOM
- `datastar-patch-signals` - Update reactive signals

**SDK Helper Methods** (official Datastar SDK convenience wrappers):
- `patchElements()` - Sends `datastar-patch-elements` event
- `patchSignals()` - Sends `datastar-patch-signals` event
- `executeScript()` - Convenience wrapper that uses `patch-elements` with `mode: append, selector: body` to inject a `<script>` tag that auto-removes after execution. Use sparingly; prefer declarative HTML.
- `removeElements()` - Convenience wrapper for `patchElements` with `mode: remove`
- `removeSignals()` - Convenience wrapper for `patchSignals` with null values

**Note:** Bonsai uses a custom `SseFormatter` class that implements the same API as the official Datastar SDK, but adapted for Hono's streaming infrastructure.

---

## 9. Theme System & Global APIs

**Architecture**
- Bonsai uses a server-rendered theme provider with a client-side controller to prevent FOUC and enable seamless theme switching.
- A nonce'd bootstrap script in `<head>` applies the theme class before CSS loads.
- The `ThemeController` manages preference storage, system preference detection, and DOM updates.

**Persistence Strategy**
- Theme preference is persisted in **both** localStorage and a cookie (`bonsai-ui-theme` by default).
- **localStorage**: Client-side preference storage (primary).
- **Cookie**: Allows the server to read the user's preference before rendering, eliminating FOUC even on slow devices.
- The server reads the cookie in `renderer` and passes it to `resolveThemeProvider` to set the correct initial class.
- Cookie attributes: `path=/`, `max-age=1year`, `SameSite=Lax` (not HTTP-only, so client can read/write).

**Global API (Official)**
- All theme actions are exposed under `window.Bonsai.actions.theme`:
  - `window.Bonsai.actions.theme.setLight()` - Set light mode
  - `window.Bonsai.actions.theme.setDark()` - Set dark mode
  - `window.Bonsai.actions.theme.setSystem()` - Follow system preference
  - `window.Bonsai.actions.theme.toggle()` - Toggle between light/dark
  - `window.Bonsai.actions.theme.set(pref)` - Set any preference

**Usage in Datastar Attributes**
```tsx
// Recommended: Use the namespaced API
<button data-on:click="window.Bonsai.actions.theme.setLight()">Light</button>

// Or import expression constants for consistency
import { themeExpressions } from '@/core/theme-client'
<button data-on:click={themeExpressions.setLight}>Light</button>
```

**Theme Change Event**
- The runtime emits a `bonsai-theme-change` custom event whenever the theme changes.
- **Always use this event** for components that need to react to theme changes (charts, maps, visualizations).
- Do not poll or manually check theme state—subscribe to the event instead.
```tsx
// Recommended: Listen to the theme change event
data-on:bonsai-theme-change__window="/* handle theme change */"

// Example: Re-render a chart when theme changes
data-on:bonsai-theme-change__window="renderChart(evt.detail.resolved)"
```
- Event detail: `{ preference: ThemePreference, resolved: 'light' | 'dark' }`
- The event fires on every theme change, including system preference changes when preference is "system".

**Advanced Usage**
- Access the full controller via `window.Bonsai.theme` for subscription, preference queries, etc.
- Both `window.Bonsai.theme` and `window.Bonsai.actions.theme` are frozen with `Object.freeze()` to prevent mutation and ensure API stability.

---

## 10. shadcn/ui + Hono JSX

- **Design System**: shadcn/ui components live under `src/components/ui`. Styling depends on `class-variance-authority`, `clsx`, `tailwind-merge`, and `lucide-react`, with tokens defined in `styles.css` and the `cn()` helper in `src/lib/utils.ts`.
- **Adding Components**: run `bunx --bun shadcn@latest add <component>` to scaffold, then convert from React to Hono JSX—drop React/Radix imports, replace `className` with `class`, remove `Slot`/`asChild`, and keep markup in native HTML elements.
- **Typing Requirements**: define props via `type Props = JSX.IntrinsicElements['tag'] & { customVariantProps }`; never fall back to `[key: string]: any`. Variant-driven styling stays in `cva` definitions so types line up with `VariantProps<typeof componentVariants>`.
- **Available Building Blocks**: `Button`, `Card` (+Header/Title/Description/Content/Action/Footer), `Input`, `Label`, `Badge`, and `Textarea` are pre-converted and Datastar-safe. Import them from `@/components/ui/*` and freely add `data-*` attributes for signals, indicators, and bindings.
- **Usage Patterns**: always merge classes with `cn()`, keep elements focusable/ARIA-correct, and wrap datastar conditionals with `data-show` + `style="display:none"`. For actions, pair shadcn controls with `@post(...)` and indicator signals the same way other Bonsai components do.
- **Trigger Rule**: when a shadcn control acts as a Datastar trigger, style the native `<button>`/`<a>` directly (e.g., via `buttonVariants`). Never nest a shadcn `<Button>` inside another interactive element or you'll swallow the Datastar handlers.
- **Verification**: after adding or editing components, run `bun run build:css` and `bun run typecheck`.

---

## 11. Architecture & Meta-Framework

**What is Bonsai?**
- Bonsai is a meta-framework built on Hono (web server) and Datastar (hypermedia reactivity).
- It provides a batteries-included foundation for building hypermedia-driven MPAs with real-time SSE updates.
- Core philosophy: server-rendered HTML is the source of truth, enhanced with reactive signals and live patches.

**Core Framework Structure** (`src/core/`)
- `router/` - File-based routing with compile-time manifest generation
- `datastar/` - SSE event bus, responders, formatters, and middleware
- `page.ts` - Type-safe page and handler definitions
- `route.ts` - Type-safe route helpers with parameter extraction
- `renderer.tsx` - Server-side JSX renderer with theme, CSP, and nonce support
- `theme.ts` & `theme-client.ts` - Server/client theme system
- `security.ts` - CSRF protection
- `middleware.ts` - Factory for creating app middleware

**Router System**
- Routes live in `src/pages/` following Next.js-style file conventions:
  - `index.tsx` → `/`
  - `issues.tsx` → `/issues`
  - `issues/[id].tsx` → `/issues/:id`
  - `issues/[id]/comments.tsx` → `/issues/:id/comments`
  - Files starting with `_` are ignored (e.g., `_components/`)
- **Build-time manifest generation** (`scripts/generate-route-manifest.ts`):
  - Scans `src/pages/` and generates `src/routes.manifest.ts` with lazy imports
  - Generates `src/routes.ts` with type-safe route helpers
  - Run via `bun run routes:generate` (included in dev/build scripts)
- **Route configuration** (`scripts/routes.config.json`):
  - Maps routes to custom property paths for the `routes` object
  - Supports multiple aliases per route
  - Falls back to auto-generated paths from URL segments
- **Type-safe routing**:
  ```typescript
  import { routes } from '@/routes'
  
  routes.issues.href() // → '/issues'
  routes.issues.id.href({ id: 123 }) // → '/issues/123'
  routes.issues.id.pattern // → '/issues/:id'
  ```

**Pages & Handlers**
- Use `createPage()` for GET routes that render full pages:
  ```typescript
  export default createPage({
    use: [requireAuth], // Optional middleware
    loader: async (c) => ({ data: await fetchData(c) }), // Optional loader
    component: (props) => <div>{props.data}</div>,
    topics: ['issues:list'], // SSE topics to subscribe
  })
  ```
- Use `createHandler()` for POST/PUT/PATCH/DELETE routes:
  ```typescript
  export const POST = createHandler({
    use: [requireAuth],
    async handler(c) {
      // Validate, mutate DB, broadcast updates
      return c.var.datastar.reply([...effects])
    }
  })
  ```
- **Never export a page and a handler with the same HTTP method** - the router will register only the first match.

---

## 12. Pub/Sub Bus & Multi-Instance Scaling

**Bus Abstraction**
- Bonsai uses a `PubSubBus` interface to decouple SSE distribution from implementation.
- Two implementations:
  - `MemoryBus` - In-process pub/sub (default, single-instance)
  - `RedisBus` - Redis-backed pub/sub (multi-instance deployments)

**When to Use Which**
- **MemoryBus** (default): Development, single-server deployments, no Redis available.
- **RedisBus**: Production with multiple server instances, horizontal scaling, or when SSE clients may connect to different servers.

**Configuration** (`src/middleware/bus.ts`)
- The app automatically detects `BONSAI_REDIS_URL` or `REDIS_URL` environment variables.
- If present, initializes `RedisBus` with separate publisher/subscriber connections.
- Falls back to `MemoryBus` if Redis is unavailable.
- **Never hardcode bus selection** - use the environment-based factory in `src/middleware/bus.ts`.

**RedisBus Internals**
- Channel naming: `${prefix}:${kind}:${id}` (e.g., `bonsai:bus:topic:issues:list`)
- Three channel types:
  - `client` - Tab-specific messages (replies)
  - `topic` - Topic-based broadcasts
  - `broadcast` - Global messages to all connected clients
- Manages subscriptions dynamically: subscribes when first sink registers, unsubscribes when last sink deregisters.
- Uses reference counting to track sinks across multiple topic/client subscriptions.

**Bus API** (available via `c.var.bus`)
```typescript
// Low-level API (use datastar responder instead)
bus.subscribeClient(clientId, sink) // Subscribe to client-specific messages
bus.subscribeTopic(topic, sink) // Subscribe to topic broadcasts
bus.toClient(clientId, msg) // Send SSE payload to a specific client
bus.toTopic(topic, msg) // Broadcast SSE payload to all subscribers of a topic
bus.toAll(msg) // Broadcast to all connected clients
```

**Best Practices**
- Always use `c.var.datastar.reply()` and `c.var.datastar.broadcast()` instead of calling bus methods directly.
- The datastar responder handles rendering, serialization, and bus routing.
- Define all topics in `src/lib/topics.ts` and reference them via imports - never inline topic strings.

**Testing**
- `MemoryBus` and `RedisBus` share the same test suite (`bus.test.ts`, `redis-bus.test.ts`).
- Both implementations must satisfy the `PubSubBus` contract.
- Tests verify: subscription/unsubscription, targeted client messages, topic broadcasts, global broadcasts, and cleanup.

---

## 13. Type-Safe Routes

**Route Definition**
- Routes are auto-generated from `src/pages/` file structure.
- `scripts/generate-route-manifest.ts` runs before every build/dev to update `src/routes.ts` and `src/routes.manifest.ts`.
- **Never manually edit** `src/routes.ts` or `src/routes.manifest.ts` - they are overwritten on every build.

**Route Helpers** (`src/core/route.ts`)
- `route()` - Builds a nested object tree of route definitions with type-safe `.href()` methods.
- Parameter extraction: `:param` in route paths becomes required parameter in `.href({ param: value })`.
- Type safety: TypeScript enforces parameter presence and types at compile time.

**Customizing Route Paths** (`scripts/routes.config.json`)
```json
{
  "/issues/:id": [["issues", "detail"]],
  "/issues/:id/comments": [["issues", "detail", "comments"], ["comments", "forIssue"]]
}
```
- Maps URL patterns to property paths in the `routes` object.
- Supports multiple aliases: one route can be accessed via different paths in the `routes` tree.
- If a route is not in the config, it falls back to auto-generated property names (URL segments with camelCase sanitization).

**Usage in Components**
```tsx
import { routes } from '@/routes'

<a href={routes.issues.href()}>All Issues</a>
<a href={routes.issues.id.href({ id: issue.id })}>Issue #{issue.id}</a>
<a href={routes.issues.new.href()}>New Issue</a>
```

**Usage in Handlers**
```typescript
import { routes } from '@/routes'

// Redirect after mutation
return c.redirect(routes.issues.id.href({ id: created.id }))
```

**Parameter Encoding**
- Route helpers automatically `encodeURIComponent()` parameter values.
- **Never manually encode** parameters before passing to `.href()`.

---

## 14. Workflow Checklist

Before opening a PR, confirm:

1. **CSP** still allows `'unsafe-eval'`.
2. **Signals** contain no secrets; `data-persist` (if used) filters sensitive data.
3. **`data-computed` purity**; moved side-effects to `data-effect`.
4. **Indicators before init**; no request starts without its indicator.
5. **`data-show`** elements include `style="display:none"`.
6. **Forms/file inputs** follow the single-handling rule.
7. **Topics & SSE**: shared updates broadcast via defined topics; patch targets have IDs.
8. **No explicit `mode: 'outer'`** - it's the default, omit it.
9. **Fat patches** - prefer full region re-renders over incremental append/prepend.
10. **Modals** conform to the pattern (Escape/outside close, focus trap, teardown).
11. **`openWhenHidden`** only where truly needed.
12. **Routes manifest** is regenerated (`bun run routes:generate` runs automatically in dev/build).
13. **Type-safe routes** - use `routes` object instead of hardcoded strings.
14. **Bus usage** - use `c.var.datastar.reply()`/`broadcast()` instead of calling bus directly.
15. **Lint + typecheck** (`bun run lint`, `bun run typecheck`) succeed locally; include results in your summary if requested.

---

## 15. Quick Start for New Features

1. **Model shared vs tab-specific** state to determine reply/broadcast.
2. **Add/extend topic** in `src/lib/topics.ts`.
3. **Update loader** to fetch initial data and subscribe to the relevant topics.
4. **Build UI component** with stable IDs and Datastar-friendly attributes.
5. **Write handler**:
   - Validate input (Zod).
   - On failure, `reply()` with targeted feedback.
   - On success, mutate DB, re-fetch canonical state, and `broadcast()` the new markup.
6. **Test** by running through the real workflow: navigation (anchors), SSE updates, opening/closing modals, relaunching actions after backgrounding the tab.

If in doubt, search the repo for an existing pattern (`LabelsSection`, `IssueModal`, comments handler) and follow it exactly.

---

By adhering to these conventions we keep Bonsai predictable: every page load is deterministic, real-time updates heal themselves, and agents can ship features quickly without regressing the MPA contract. When you find a scenario not covered here, document it in this file before landing your change.
