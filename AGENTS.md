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

1. **Pages** (`createPage`) declare their topics. The renderer automatically subscribes via `<body data-init="@get('<sse-endpoint>?topics=…')">` (endpoint defaults to `/_/events`, configurable via `BonsaiConfig`).
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

## 7. Framework Configuration

**BonsaiConfig System**
- Bonsai is configurable via a typed `BonsaiConfig` object with safe defaults.
- The `renderer()` and `createSseEndpoint()` factories accept optional config overrides.
- Zero-config usage works out of the box—defaults match previous hardcoded behavior.

**Configuration Structure** (`src/core/config.ts`)
```typescript
type BonsaiConfig = {
  assets: {
    css: string          // Default: '/styles.css'
    runtime: string      // Default: '/runtime.js'
    datastar: string     // Default: '/datastar.js'
  }
  endpoints: {
    sse: string          // Default: '/_/events'
  }
  security: {
    csp: string          // Template with ${nonce} placeholder
    csrf?: {
      cookieName?: string        // Default: 'ds_csrf'
      headerName?: string        // Default: 'X-CSRF-Token'
      exceptPaths?: (string | RegExp)[]  // Defaults to [config.endpoints.sse]
    }
  }
  sse?: {
    pingIntervalMs?: number  // Default: 25000
  }
}
```

**Usage Patterns**
```typescript
// Zero-config (recommended for most apps)
app.use('*', csrf())
app.use('*', renderer())
app.get('/_/events', createSseEndpoint())

// Custom configuration
const config = {
  assets: { css: '/assets/styles.css' },
  endpoints: { sse: '/events' },
  security: {
    csp: "script-src 'self' 'unsafe-eval' 'nonce-${nonce}' cdn.example.com;",
    csrf: {
      cookieName: 'my_csrf',
      headerName: 'X-My-CSRF-Token',
      exceptPaths: ['/events', /^\/api\/webhooks/]
    }
  },
  sse: { pingIntervalMs: 30000 }
}
app.use('*', csrf(config))
app.use('*', renderer(config))
app.get('/events', createSseEndpoint(config))
```

**CSP Requirements**
- CSP MUST include `'unsafe-eval'` (Datastar expressions rely on `Function()`).
- The renderer automatically injects the per-request nonce via `${nonce}` template replacement.
- Extend the CSP string to allow additional script sources if needed, but never remove `'unsafe-eval'`.

**CSRF Configuration**
- The `csrf()` middleware accepts either `BonsaiConfig` or legacy `CsrfOpts` for backwards compatibility.
- `exceptPaths` defaults to the configured SSE endpoint (`config.endpoints.sse`) to allow SSE connections without CSRF validation.
- When using custom SSE endpoints, the framework automatically syncs `csrf.exceptPaths` unless explicitly overridden.
- Cookie is not HTTP-only to allow client-side JavaScript to read the token for XHR/fetch requests.

**Security Rules**
- Sanitize/escape any untrusted HTML strings you interpolate into JSX attributes.
- Never leak credentials or CSRF tokens to the client beyond what `renderer` already exposes via the runtime meta/script.
- Always validate CSRF tokens for state-changing requests (POST/PUT/PATCH/DELETE).

**SSE Topic Security**
- **Threat Model**: Without protection, clients can guess topic names and subscribe to unauthorized data streams (e.g., `user:123`, `org:456`), causing cross-tenant data leakage.
- **Protection**: Bonsai signs the allowed topic list on page render and validates it on SSE connection.
- **How it works**:
  1. `renderer()` calls `signTopics(c, c.var.sseTopics, config)` before rendering the page
  2. Sets an HttpOnly cookie with HMAC-SHA256 signed token containing allowed topics
  3. `createSseEndpoint()` verifies the token and only subscribes to the intersection of requested and allowed topics
  4. Tokens are bound to client/tab ID by default to prevent reuse across tabs
- **Configuration** (`config.security.topics`):
  - `cookieName`: Cookie name for signed token (default: `bonsai_topics`)
  - `maxAgeSec`: Token TTL in seconds (default: 300 / 5 minutes)
  - `secretEnv`: Environment variable for signing secret (default: `BONSAI_SIGNING_SECRET`)
  - `bindToClientId`: Bind token to tab ID (default: true)
- **Deployment Requirements**:
  - **Production**: Set `BONSAI_SIGNING_SECRET` to a strong random secret (32+ bytes)
  - **Development**: Without secret, topic enforcement is disabled with a warning
  - **Multi-instance**: Purely stateless HMAC—no shared state required
- **When to Customize**:
  - Adjust `maxAgeSec` if users navigate rapidly or need longer sessions
  - Use a longer `secretEnv` name if you need multiple secrets for rotation
  - Set `bindToClientId: false` only if you explicitly want tokens shared across tabs

---

## 8. CSP & Security (Legacy)

This section is now covered by Framework Configuration (section 7).

---

## 9. SSE Events & SDK Methods

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

## 10. Extensible Effect System

**Philosophy**
- Bonsai elevates from a framework implementation to a true meta-framework by making effects extensible.
- Users can create their own high-level, declarative effects that compose built-in effects.
- This keeps handlers clean and enables application-specific abstractions.

**Effect Registry**
- Every `DatastarResponder` instance has an `effectRegistry` that maps effect names to handler functions.
- Built-in effects (`patch-elements`, `patch-signals`, etc.) are pre-registered.
- Custom effects can be registered via middleware.

**Registering Custom Effects**
```typescript
// Single effect
import { registerEffect } from '@/core'

app.use('*', registerEffect('toast:show', async (c, message: string, type: 'success' | 'error') => {
  // Custom effects can compose other effects
  await c.var.datastar.reply([
    ['patch-elements', <Toast message={message} type={type} />, { selector: '#toast-container', mode: 'append' }]
  ])
}))

// Multiple effects at once
import { registerEffects } from '@/core'

app.use('*', registerEffects({
  'toast:show': async (c, message: string, type: 'success' | 'error') => {
    await c.var.datastar.reply([
      ['patch-elements', <Toast message={message} type={type} />, { selector: '#toast-container', mode: 'append' }]
    ])
  },
  'modal:close': async (c, modalId: string) => {
    await c.var.datastar.reply([
      ['patch-elements', '', { selector: `#${modalId}`, mode: 'remove' }]
    ])
  },
  'analytics:track': async (c, event: string, properties: Record<string, unknown>) => {
    // Side-effect only effects are valid too
    await fetch('https://analytics.example.com/track', {
      method: 'POST',
      body: JSON.stringify({ event, properties })
    })
  }
}))
```

**Using Custom Effects**
```typescript
export const POST = createHandler({
  async handler(c) {
    // Validate and process...
    
    // Use custom effect instead of verbose built-in composition
    return c.var.datastar.reply([
      ['toast:show', 'Issue created successfully!', 'success'],
      ['modal:close', 'create-issue-modal']
    ])
  }
})
```

**Effect Handler Signature**
```typescript
type EffectHandler<TArgs extends unknown[] = unknown[]> = (
  c: Context<AppEnv>,
  ...args: TArgs
) => Promise<void>
```

**Built-in Effects** (pre-registered, always available):
- `patch-elements` - Render JSX and patch HTML into the DOM
- `patch-elements-seq` - Patch a sequence of HTML fragments
- `patch-signals` - Update reactive signals
- `execute-script` - Execute JavaScript (use sparingly)
- `close-sse` - Close the SSE connection

**Effect Composition Patterns**
```typescript
// Good: Compose multiple patches into a semantic effect
registerEffect('issue:created', async (c, issue: Issue) => {
  await c.var.datastar.broadcast('issues:list', [
    ['patch-elements', <IssuesList issues={await fetchIssues(c)} />],
    ['patch-signals', { selectedIssueId: issue.id }]
  ])
})

// Good: Side-effect + UI update
registerEffect('notification:send', async (c, userId: string, message: string) => {
  await sendPushNotification(userId, message)
  await c.var.datastar.broadcast(`user:${userId}`, [
    ['patch-elements', <NotificationBadge count={await getUnreadCount(c, userId)} />]
  ])
})

// Bad: Effects that just wrap a single built-in effect without adding value
registerEffect('just-patch', async (c, component) => {
  await c.var.datastar.reply([['patch-elements', component]])
}) // ❌ Just use patch-elements directly
```

**Type Safety**
```typescript
import type { TypedEffectHandler } from '@/core'

// Define your effect signature
type ToastEffect = ['toast:show', message: string, type: 'success' | 'error']

// Type-safe handler
const toastHandler: TypedEffectHandler<ToastEffect> = async (c, message, type) => {
  // TypeScript knows message is string and type is 'success' | 'error'
}

app.use('*', registerEffect('toast:show', toastHandler))
```

**Effect Registry API**
```typescript
// Access via c.var.datastar.effectRegistry

// Check if effect exists
if (c.var.datastar.effectRegistry.has('toast:show')) { /* ... */ }

// Get all registered effects
const effects = c.var.datastar.effectRegistry.getEffectNames()

// Unregister an effect (rare)
c.var.datastar.effectRegistry.unregister('toast:show')
```

**Best Practices**
1. **Naming**: Use namespaced names like `domain:action` (e.g., `toast:show`, `modal:close`, `analytics:track`).
2. **Composition**: Custom effects should compose built-in effects or handle side-effects, not duplicate logic.
3. **Type Safety**: Use `TypedEffectHandler` to ensure type-safe effect handlers.
4. **Registration**: Register effects early in the middleware chain (before route handlers).
5. **Documentation**: Document custom effects in your app's README or a dedicated file.

**When to Create Custom Effects**
- ✅ You use the same composition of effects in multiple handlers
- ✅ You want domain-specific abstractions (e.g., `order:complete`, `user:notify`)
- ✅ You need to integrate with external services (analytics, logging, webhooks)
- ❌ One-off effect usage (just use built-in effects directly)
- ❌ Simple wrappers that don't add value

---

## 11. Theme System & Global APIs

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

## 12. shadcn/ui + Hono JSX

- **Design System**: shadcn/ui components live under `src/components/ui`. Styling depends on `class-variance-authority`, `clsx`, `tailwind-merge`, and `lucide-react`, with tokens defined in `styles.css` and the `cn()` helper in `src/lib/utils.ts`.
- **Adding Components**: run `bunx --bun shadcn@latest add <component>` to scaffold, then convert from React to Hono JSX—drop React/Radix imports, replace `className` with `class`, remove `Slot`/`asChild`, and keep markup in native HTML elements.
- **Typing Requirements**: define props via `type Props = JSX.IntrinsicElements['tag'] & { customVariantProps }`; never fall back to `[key: string]: any`. Variant-driven styling stays in `cva` definitions so types line up with `VariantProps<typeof componentVariants>`.
- **Available Building Blocks**: `Button`, `Card` (+Header/Title/Description/Content/Action/Footer), `Input`, `Label`, `Badge`, and `Textarea` are pre-converted and Datastar-safe. Import them from `@/components/ui/*` and freely add `data-*` attributes for signals, indicators, and bindings.
- **Usage Patterns**: always merge classes with `cn()`, keep elements focusable/ARIA-correct, and wrap datastar conditionals with `data-show` + `style="display:none"`. For actions, pair shadcn controls with `@post(...)` and indicator signals the same way other Bonsai components do.
- **Trigger Rule**: when a shadcn control acts as a Datastar trigger, style the native `<button>`/`<a>` directly (e.g., via `buttonVariants`). Never nest a shadcn `<Button>` inside another interactive element or you'll swallow the Datastar handlers.
- **Verification**: after adding or editing components, run `bun run build:css` and `bun run typecheck`.

---

## 13. Architecture & Meta-Framework

**What is Bonsai?**
- Bonsai is a **runtime-agnostic** meta-framework built on Hono (web server) and Datastar (hypermedia reactivity).
- It provides a batteries-included foundation for building hypermedia-driven MPAs with real-time SSE updates.
- Core philosophy: server-rendered HTML is the source of truth, enhanced with reactive signals and live patches.
- **Works with**: Node.js, Bun, Deno, Cloudflare Workers, and any runtime supported by Hono.

**Core Framework Structure** (`src/core/`)
- `router/` - File-based routing with compile-time manifest generation (runtime-agnostic)
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
- **Build-time manifest generation** (`src/core/router/generator.ts`):
  - Runtime-agnostic implementation using standard Node.js APIs
  - Scans `src/pages/` and generates `src/routes.manifest.ts` with lazy imports
  - Generates `src/routes.ts` with type-safe route helpers
  - Run via `npm run routes:generate` or `bun run routes:generate` (included in dev/build scripts)
  - Can be imported programmatically: `import { generateRouteManifest } from '@/core'`
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

## 14. Pub/Sub Bus & Multi-Instance Scaling

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

## 15. Type-Safe Routes

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

## 16. Workflow Checklist

Before opening a PR, confirm:

1. **Config**: If customizing assets/endpoints/CSP, use `renderer(config)` and `createSseEndpoint(config)` factories.
2. **CSP** still allows `'unsafe-eval'` (required for Datastar).
3. **Topic Security**: `BONSAI_SIGNING_SECRET` is set in production environment.
4. **Signals** contain no secrets; `data-persist` (if used) filters sensitive data.
5. **`data-computed` purity**; moved side-effects to `data-effect`.
6. **Indicators before init**; no request starts without its indicator.
7. **`data-show`** elements include `style="display:none"`.
8. **Forms/file inputs** follow the single-handling rule.
9. **Topics & SSE**: shared updates broadcast via defined topics; patch targets have IDs.
10. **No explicit `mode: 'outer'`** - it's the default, omit it.
11. **Fat patches** - prefer full region re-renders over incremental append/prepend.
12. **Modals** conform to the pattern (Escape/outside close, focus trap, teardown).
13. **`openWhenHidden`** only where truly needed.
14. **Routes manifest** is regenerated (`bun run routes:generate` runs automatically in dev/build).
15. **Type-safe routes** - use `routes` object instead of hardcoded strings.
16. **Bus usage** - use `c.var.datastar.reply()`/`broadcast()` instead of calling bus directly.
17. **Lint + typecheck** (`bun run lint`, `bun run typecheck`) succeed locally; include results in your summary if requested.

---

## 17. Quick Start for New Features

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
