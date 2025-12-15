# Honostar Engineering & Agent Guide

This is the canonical playbook for any human or AI engineer working on Honostar. The rules below reflect production constraints and Datastar best-practices—follow them exactly unless product requirements explicitly say otherwise.

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
| `c.var.fx.reply()` | Feedback that should only update the initiating tab (validation errors, modal close, toast) | Tab-scoped patch via HTTP (built-in effects) with automatic SSE fallback |
| `c.var.fx.broadcast(topic, …)` | Shared state that all viewers must see (new issue/comment/label) | broadcast to a page topic (define topics in `src/lib/topics.ts`) |

`reply()` inspects the incoming request. If it came from a Datastar action and the response can be expressed as a single built-in effect (`patch-elements`, `patch-elements-seq`, or `patch-signals`), Honostar returns an HTTP response (`text/html` or `application/json`) with the appropriate `datastar-*` headers so the client can morph the DOM without relying on the SSE bus. When the response contains multiple effects, custom effect handlers, or scripts, it automatically falls back to the prior SSE-based delivery through the request’s `X-Tab-ID`.

Rules:
1. Every shared state change must "fan out" through a **topic** defined in `src/lib/topics.ts`. Never inline topic strings.
2. Use "fat patches": re-render the entire region you're updating so missed events can self-heal.

**CQRS & Event-Driven Architecture**

Honostar follows **Command Query Responsibility Segregation (CQRS)** for optimal real-time updates:

- **Commands** (POST/PUT/PATCH/DELETE): Change data but don't directly update views
  - Mutate the database and publish events to topics
  - Use `c.var.fx.reply()` only for validation errors or confirmation signals
  - Don't re-render and broadcast in the same handler—let queries handle that
- **Queries** (GET + SSE): Read data and watch for changes via topics
  - Subscribe to topics declared in `createPage({ topics: [...] })`
  - Re-fetch canonical state and re-render entire regions when events arrive
  - Each page typically has one long-lived SSE connection

**Why CQRS?**
- **Self-healing**: Queries always render the full current state, so missed events don't corrupt the UI
- **Multiplayer by default**: All clients subscribe to the same topics and see the same canonical state
- **Separation of concerns**: Commands focus on business logic; queries focus on presentation

**Event-Driven Flow**
1. User submits form → Command handler validates and mutates DB
2. Command publishes event to topic: `c.var.fx.broadcast('issues:list', [...])`
3. All connected clients listening to `issues:list` receive the event
4. Queries re-fetch data and re-render their regions
5. Clients self-heal even if they missed intermediate events

---

## 3. Page & Topic Wiring

1. **Pages** (`createPage`) declare their topics. The renderer automatically subscribes via `<body data-init="@get('<sse-endpoint>?topics=…')">` (endpoint defaults to `/_/events`, configurable via `HonostarConfig`).
2. Components that will be patched must expose a **stable root ID** (`id="issues-list"`).
3. SSE responses should target those IDs and use default `outer` morphing unless you're intentionally appending/prepending list items.

**Initial Page Load Strategies**

Choose one approach for your initial page render:

**Option A: Stub + SSE Warmup**
- Send minimal HTML stub on initial GET
- Send full content immediately via SSE on `data-init`
- **Pros**: Warms Brotli compression before first interaction
- **Cons**: Slower time to first contentful paint

**Option B: Full Page + SSE Subscription**
- Send complete page on initial GET
- Open SSE connection for subsequent updates
- **Pros**: Faster initial render, works without JavaScript
- **Cons**: SSE compression not pre-warmed

**Option C: Full Page + Immediate SSE Patch (Recommended)**
- Send complete page on initial GET
- Immediately re-send same content via SSE on connection
- **Pros**: No flash, warms compression, prevents stale state
- **Cons**: Slight duplication (but compressed)
- **Why**: Prevents race condition where events occur between page load and SSE connection

---

## 4. Datastar Attribute Rules

**General**
- Keep expressions pure; no imperative JS outside supported helpers.
- Attribute order matters; data-star runs top to bottom.

**Signals & Expressions**
- `data-signals` overwrites values immediately. `data-signals__ifmissing` only seeds absent signals.
- Keys defined via kebab case become camelCase in expressions (e.g., `data-signals:new-comment` ⇒ `$newComment`).
- Never store secrets/tokens/passwords in signals. They're user-editable.
- `data-persist` is banned unless you add `include`/`exclude` filters to avoid persisting sensitive keys.

**Signals Philosophy: Start with Zero**
- Default to **zero signals** for most CRUD apps
- Use signals only for:
  - Ephemeral UI state (modal visibility, dropdowns, toggles)
  - Form input binding when posting to backend (signals auto-include in requests)
  - Client-side interactivity that doesn't need server persistence
- Avoid signals for:
  - Form validation (do server-side)
  - Tracking dirty state (use server-side state)
  - Data that should persist (use database + broadcast)

**When Signals Make Sense**
- You're building highly interactive visualizations (3D globes, charts, maps)
- You need instant client-side feedback before server round-trip
- You're binding form inputs and want automatic inclusion in @post requests

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

**Loading Indicators with CQRS**
- For request/response: `data-indicator:_fetching` + reset on response works as expected
- For CQRS + SSE: Indicator resets when *command completes*, not when *query renders*
- Solution: Manually control loading state via signal patches:
  ```typescript
  // Command endpoint sets loading=true before processing
  c.var.fx.reply([['patch-signals', { loading: true }]])

  // Query endpoint sets loading=false after re-rendering
  c.var.fx.broadcast(topic, [
    ['patch-elements', <UpdatedView />],
    ['patch-signals', { loading: false }]
  ])
  ```

**`openWhenHidden` Best Practices**
- **GET requests**: Default (`false`) is correct—pause SSE on hidden tabs to save battery
- **POST/PUT/PATCH/DELETE**: Consider `openWhenHidden: true` to prevent request cancellation
  - User switches tabs mid-request → request cancels and restarts on return
  - Critical for file uploads, slow database operations, or non-idempotent mutations
- **Exception**: Dashboard pages with real-time data should use `openWhenHidden: true` for GET

**Rationale**
- GET requests are safe to retry (idempotent, cacheable per HTTP spec)
- Mutation requests may cause duplicate processing if interrupted and retried
- Browser doesn't reload POST pages without confirmation; Datastar should follow suit

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
- When closing, also remove the DOM node via SSE or `window.Honostar.modals.close(id)` so inert state clears.

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
c.var.fx.broadcast(topic, [
  ['patch-elements', <IssuesList issues={allIssues} />]
])

// Good: Selector required for append mode
c.var.fx.reply([
  ['patch-elements', <Modal />, { selector: '#ds-overlays', mode: 'append' }]
])

// Bad: Redundant explicit outer mode
['patch-elements', component, { mode: 'outer' }] // ❌ Remove mode
```

---

## 7. Framework Configuration

**HonostarConfig System**
- Honostar is configurable via a typed `HonostarConfig` object with safe defaults.
- The `renderer()` and `createSseEndpoint()` factories accept optional config overrides.
- Zero-config usage works out of the box—defaults match previous hardcoded behavior.

**Configuration Structure** (`src/core/config.ts`)
```typescript
type HonostarConfig = {
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
- The `csrf()` middleware accepts either `HonostarConfig` or legacy `CsrfOpts` for backwards compatibility.
- `exceptPaths` defaults to the configured SSE endpoint (`config.endpoints.sse`) to allow SSE connections without CSRF validation.
- When using custom SSE endpoints, the framework automatically syncs `csrf.exceptPaths` unless explicitly overridden.
- Cookie is not HTTP-only to allow client-side JavaScript to read the token for XHR/fetch requests.

**Security Rules**
- Sanitize/escape any untrusted HTML strings you interpolate into JSX attributes.
- Never leak credentials or CSRF tokens to the client beyond what `renderer` already exposes via the runtime meta/script.
- Always validate CSRF tokens for state-changing requests (POST/PUT/PATCH/DELETE).

**SSE Topic Security**
- **Threat Model**: Without protection, clients can guess topic names and subscribe to unauthorized data streams (e.g., `user:123`, `org:456`), causing cross-tenant data leakage.
- **Protection**: Honostar signs the allowed topic list on page render and validates it on SSE connection.
- **How it works**:
  1. `renderer()` calls `signTopics(c, c.var.sseTopics, config)` before rendering the page
  2. Sets an HttpOnly cookie with HMAC-SHA256 signed token containing allowed topics
  3. `createSseEndpoint()` verifies the token and only subscribes to the intersection of requested and allowed topics
  4. Tokens are bound to client/tab ID by default to prevent reuse across tabs
- **Configuration** (`config.security.topics`):
  - `cookieName`: Cookie name for signed token (default: `honostar_topics`)
  - `maxAgeSec`: Token TTL in seconds (default: 300 / 5 minutes)
  - `secretEnv`: Environment variable for signing secret (default: `HONOSTAR_SIGNING_SECRET`)
  - `bindToClientId`: Bind token to tab ID (default: true)
- **Deployment Requirements**:
  - **Production**: Set `HONOSTAR_SIGNING_SECRET` to a strong random secret (32+ bytes)
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

**Note:** Honostar uses a custom `SseFormatter` class that implements the same API as the official Datastar SDK, but adapted for Hono's streaming infrastructure.

---

## 10. Extensible Effect System

**Philosophy**
- Honostar elevates from a framework implementation to a true meta-framework by making effects extensible.
- Users can create their own high-level, declarative effects that compose built-in effects.
- This keeps handlers clean and enables application-specific abstractions.

**Effect Registry**
- Every `FxResponder` instance has an `effectRegistry` that maps effect names to handler functions.
- Built-in effects (`patch-elements`, `patch-signals`, etc.) are pre-registered.
- Custom effects can be registered via middleware.

**Registering Custom Effects**
```typescript
// Single effect
import { registerEffect } from '@/core'

app.use('*', registerEffect('toast:show', async (c, message: string, type: 'success' | 'error') => {
  // Custom effects can compose other effects
  await c.var.fx.reply([
    ['patch-elements', <Toast message={message} type={type} />, { selector: '#toast-container', mode: 'append' }]
  ])
}))

// Multiple effects at once
import { registerEffects } from '@/core'

app.use('*', registerEffects({
  'toast:show': async (c, message: string, type: 'success' | 'error') => {
    await c.var.fx.reply([
      ['patch-elements', <Toast message={message} type={type} />, { selector: '#toast-container', mode: 'append' }]
    ])
  },
  'modal:close': async (c, modalId: string) => {
    await c.var.fx.reply([
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
    return c.var.fx.reply([
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
  await c.var.fx.broadcast('issues:list', [
    ['patch-elements', <IssuesList issues={await fetchIssues(c)} />],
    ['patch-signals', { selectedIssueId: issue.id }]
  ])
})

// Good: Side-effect + UI update
registerEffect('notification:send', async (c, userId: string, message: string) => {
  await sendPushNotification(userId, message)
  await c.var.fx.broadcast(`user:${userId}`, [
    ['patch-elements', <NotificationBadge count={await getUnreadCount(c, userId)} />]
  ])
})

// Bad: Effects that just wrap a single built-in effect without adding value
registerEffect('just-patch', async (c, component) => {
  await c.var.fx.reply([['patch-elements', component]])
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
// Access via c.var.fx.effectRegistry

// Check if effect exists
if (c.var.fx.effectRegistry.has('toast:show')) { /* ... */ }

// Get all registered effects
const effects = c.var.fx.effectRegistry.getEffectNames()

// Unregister an effect (rare)
c.var.fx.effectRegistry.unregister('toast:show')
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
- Honostar uses a server-rendered theme provider with a client-side controller to prevent FOUC and enable seamless theme switching.
- A nonce'd bootstrap script in `<head>` applies the theme class before CSS loads.
- The `ThemeController` manages preference storage, system preference detection, and DOM updates.

**Persistence Strategy**
- Theme preference is persisted in **both** localStorage and a cookie (`honostar-ui-theme` by default).
- **localStorage**: Client-side preference storage (primary).
- **Cookie**: Allows the server to read the user's preference before rendering, eliminating FOUC even on slow devices.
- The server reads the cookie in `renderer` and passes it to `resolveThemeProvider` to set the correct initial class.
- Cookie attributes: `path=/`, `max-age=1year`, `SameSite=Lax` (not HTTP-only, so client can read/write).

**Global API (Official)**
- All theme actions are exposed under `window.Honostar.actions.theme`:
  - `window.Honostar.actions.theme.setLight()` - Set light mode
  - `window.Honostar.actions.theme.setDark()` - Set dark mode
  - `window.Honostar.actions.theme.setSystem()` - Follow system preference
  - `window.Honostar.actions.theme.toggle()` - Toggle between light/dark
  - `window.Honostar.actions.theme.set(pref)` - Set any preference

**Usage in Datastar Attributes**
```tsx
// Recommended: Use the namespaced API
<button data-on:click="window.Honostar.actions.theme.setLight()">Light</button>

// Or import expression constants for consistency
import { themeExpressions } from '@/core/theme-client'
<button data-on:click={themeExpressions.setLight}>Light</button>
```

**Theme Change Event**
- The runtime emits a `honostar-theme-change` custom event whenever the theme changes.
- **Always use this event** for components that need to react to theme changes (charts, maps, visualizations).
- Do not poll or manually check theme state—subscribe to the event instead.
```tsx
// Recommended: Listen to the theme change event
data-on:honostar-theme-change__window="/* handle theme change */"

// Example: Re-render a chart when theme changes
data-on:honostar-theme-change__window="renderChart(evt.detail.resolved)"
```
- Event detail: `{ preference: ThemePreference, resolved: 'light' | 'dark' }`
- The event fires on every theme change, including system preference changes when preference is "system".

**Advanced Usage**
- Access the full controller via `window.Honostar.theme` for subscription, preference queries, etc.
- Both `window.Honostar.theme` and `window.Honostar.actions.theme` are frozen with `Object.freeze()` to prevent mutation and ensure API stability.

---

## 12. shadcn/ui + Hono JSX

- **Design System**: shadcn/ui components live under `src/components/ui`. Styling depends on `class-variance-authority`, `clsx`, and `tailwind-merge`, with tokens defined in `styles.css` and the `cn()` helper in `src/lib/utils.ts`.
- **Adding Components**: run `bunx --bun shadcn@latest add <component>` to scaffold, then convert from React to Hono JSX—drop React/Radix imports, replace `className` with `class`, remove `Slot`/`asChild`, and keep markup in native HTML elements.
- **Typing Requirements**: define props via `type Props = JSX.IntrinsicElements['tag'] & { customVariantProps }`; never fall back to `[key: string]: any`. Variant-driven styling stays in `cva` definitions so types line up with `VariantProps<typeof componentVariants>`.
- **Available Building Blocks**: `Button`, `Card` (+Header/Title/Description/Content/Action/Footer), `Input`, `Label`, `Badge`, and `Textarea` are pre-converted and Datastar-safe. Import them from `@/components/ui/*` and freely add `data-*` attributes for signals, indicators, and bindings.
- **Usage Patterns**: always merge classes with `cn()`, keep elements focusable/ARIA-correct, and wrap datastar conditionals with `data-show` + `style="display:none"`. For actions, pair shadcn controls with `@post(...)` and indicator signals the same way other Honostar components do.
- **Trigger Rule**: when a shadcn control acts as a Datastar trigger, style the native `<button>`/`<a>` directly (e.g., via `buttonVariants`). Never nest a shadcn `<Button>` inside another interactive element or you'll swallow the Datastar handlers.
- **Verification**: after adding or editing components, run `bun run build:css` and `bun run typecheck`.

---

## 13. Architecture & Meta-Framework

**What is Honostar?**
- Honostar is a **runtime-agnostic** meta-framework built on Hono (web server) and Datastar (hypermedia reactivity).
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
- Use `createHandler()` for all action endpoints (POST/PUT/PATCH/DELETE/GET):

  **Validated Handler (with schema - recommended for Datastar endpoints):**
  ```typescript
  import { z } from 'zod'

  const schema = z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
  })

  export const POST = createHandler({
    schema,
    use: [requireAuth],
    hook: (result, c) => {
      // Handle validation errors
      const error = result.error[0]?.message || 'Invalid input'
      return c.var.fx.reply([['patch-signals', { error }]], { status: 400 })
    },
    async handler(c, data) {
      // data is 100% type-safe! No type assertions needed.
      const { title, description } = data
      // Validate, mutate DB, broadcast updates
      return c.var.fx.reply([...effects])
    }
  })
  ```

  **Base Handler (without schema - for traditional endpoints):**
  ```typescript
  export const POST = createHandler({
    async handler(c) {
      deleteCookie(c, 'token')
      return c.redirect('/login', 303)
    }
  })
  ```

- **Validator-Agnostic**: `createHandler` supports any [Standard Schema](https://standardschema.dev/) compliant validator:
  - ✅ **Zod** - `import { z } from 'zod'`
  - ✅ **Valibot** - `import * as v from 'valibot'`
  - ✅ **ArkType** - `import { type } from 'arktype'`
  - ✅ Any future Standard Schema validator

- **Automatic Data Extraction**: The handler automatically extracts data based on HTTP method:
  - **GET requests**: Parses JSON from `?datastar=` query parameter
  - **POST/PUT/PATCH/DELETE**: Parses JSON from request body

- **Type Safety**: When a schema is provided, the handler's `data` parameter is 100% type-safe based on the schema's output type. No manual type assertions needed.

- **Validation Hook**: Optional hook for custom error handling. If omitted, returns a sensible default error response.

- **Never export a page and a handler with the same HTTP method** - the router will register only the first match.

---

## 14. Performance: Brotli Streaming Compression

**Why Brotli Matters**
- Brotli compresses the **entire SSE stream**, not individual messages
- Achieves 50-400x compression over long-lived connections (typical: 26MB → 190KB over 1-2 minutes)
- Tunable context window (increase from default 32kB to 64kB+ for better compression)
- Requires HTTP/2 or HTTP/3 (avoids 6-connection limit of HTTP/1.1)

**How It Works**
- Brotli maintains a shared context window between server and client
- As the stream continues, compression ratio improves due to forward/backward referencing
- Repeated HTML structures (common in fat patches) compress extremely well
- Each subsequent patch leverages patterns from previous patches in the stream

**Configuration**
- Ensure your server supports Brotli compression (`Accept-Encoding: br` headers)
- Configure larger context windows on your reverse proxy/CDN (128kB-256kB recommended)
- Use HTTP/2 or HTTP/3 to allow multiple concurrent SSE connections
- Monitor compression ratios in production (should see >100x on long-lived connections)

**Comparison with gzip**
- gzip can't look ahead effectively and has limited look-back
- Non-adjustable 32kB context window
- Not built with streaming support in mind
- Brotli compresses 2-6x better than gzip over streams

**Real-World Stats**
- Stream duration: 1-2 minutes typical for active sessions
- Compression ratios: 100-400x on highly structured HTML
- Network savings: 99%+ reduction in bytes transferred
- CPU impact: Minimal on modern servers

**References**
- [Why You Should Use Brotli SSE](https://andersmurphy.com/2025/04/15/why-you-should-use-brotli-sse.html)

---

## 15. Pub/Sub Bus & Multi-Instance Scaling

**Bus Abstraction**
- Honostar uses a `PubSubBus` interface to decouple SSE distribution from implementation.
- Three implementations:
  - `MemoryBus` - In-process pub/sub (default, single-instance)
  - `RedisBus` - Redis-backed pub/sub (multi-instance deployments)
  - `NatsBus` - NATS-backed pub/sub (multi-instance deployments)

**When to Use Which**
- **MemoryBus** (default): Development, single-server deployments, no external message broker available.
- **RedisBus**: Production with multiple server instances using Redis infrastructure.
- **NatsBus**: Production with multiple server instances using NATS infrastructure.

**Configuration** (`src/middleware/bus.ts`)
- The app automatically detects environment variables in priority order:
  1. `HONOSTAR_NATS_URL` or `NATS_URL` → initializes `NatsBus`
  2. `HONOSTAR_REDIS_URL` or `REDIS_URL` → initializes `RedisBus`
  3. Falls back to `MemoryBus` if neither is configured
- Uses dynamic imports so nats and ioredis are optional dependencies.
- **Never hardcode bus selection** - use the environment-based factory in `src/middleware/bus.ts`.

**Bus Internals**
- **RedisBus**: Channel naming `${prefix}:${kind}:${id}` (e.g., `honostar:bus:topic:issues:list`)
- **NatsBus**: Subject naming `${prefix}.${kind}.${id}` (e.g., `honostar.bus.topic.issues:list`)
- Three channel/subject types:
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
- Always use `c.var.fx.reply()` and `c.var.fx.broadcast()` instead of calling bus methods directly.
- The datastar responder handles rendering, serialization, and bus routing.
- Define all topics in `src/lib/topics.ts` and reference them via imports - never inline topic strings.

**Testing**
- `MemoryBus`, `RedisBus`, and `NatsBus` follow the same test patterns (`bus.test.ts`, `redis-bus.test.ts`, `nats-bus.test.ts`).
- All implementations must satisfy the `PubSubBus` contract.
- Tests verify: subscription/unsubscription, targeted client messages, topic broadcasts, global broadcasts, and cleanup.

---

## 16. URL Design Philosophy

**URLs Identify Resources, Not State**
- Use URLs for **resource identification**, not for storing UI state
- Store user-specific state in:
  - **Backend**: Database, session storage (keyed by cookie)
  - **Client**: Signals (ephemeral, not persisted)
- Path parameters enforce hierarchy; prefer query parameters for flexibility
- Never store secrets or sensitive data in URLs

**Resource vs State**
- A URL points to a "game" (resource); state represents your position within that game
- Refreshing (F5) returns you to the resource's current state (as stored server-side)
- Query params can identify resource variants, but shouldn't encode complex UI state

**Examples**
- ✅ Good: `/products` (resource) + backend session stores filter preferences
- ✅ Good: `/products?category=electronics` (resource variant)
- ✅ Good: `/product/12` (specific resource identification)
- ❌ Bad: `/products?filters={"price":{"min":20}}` (encoding state in URL)
- ❌ Bad: `/products?color=red` if color is meant to be ephemeral UI state (use signals instead)

**State Persistence**
- **Stateless pages**: No backend storage; refresh starts fresh
- **Stateful pages**: Backend stores user state (keyed by session cookie)
- **Shared state**: All users see the same state (multiplayer default)
- **User-specific state**: Backend differentiates by session/user ID

**Query Parameters**
- Use for resource identification and cache keys, not state containers
- Queries can be cache-friendly: `GET /products?category=electronics` can be cached at proxy level
- Avoid dumping complex state into query strings; prefer server-side session storage

---

## 17. Type-Safe Routes

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

## 18. Workflow Checklist

Before opening a PR, confirm:

1. **Config**: If customizing assets/endpoints/CSP, use `renderer(config)` and `createSseEndpoint(config)` factories.
2. **CSP** still allows `'unsafe-eval'` (required for Datastar).
3. **Topic Security**: `HONOSTAR_SIGNING_SECRET` is set in production environment.
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
16. **Bus usage** - use `c.var.fx.reply()`/`broadcast()` instead of calling bus directly.
17. **Handler validation** - use `createHandler({ schema, ... })` for Datastar endpoints; validators must support Standard Schema spec.
18. **Error handling** - validation hook errors use `result.error[0]?.message` (Standard Schema format), not `result.error.issues`.
19. **Lint + typecheck** (`bun run lint`, `bun run typecheck`) succeed locally; include results in your summary if requested.

---

## 19. Quick Start for New Features

1. **Model shared vs tab-specific** state to determine reply/broadcast.
2. **Add/extend topic** in `src/lib/topics.ts`.
3. **Update loader** to fetch initial data and subscribe to the relevant topics.
4. **Build UI component** with stable IDs and Datastar-friendly attributes.
5. **Write handler**:
   - Define schema with your preferred validator (Zod, Valibot, ArkType).
   - Use `createHandler({ schema, hook, handler })` for automatic validation and type safety.
   - On validation failure, the hook provides detailed errors to return to the client.
   - On success, mutate DB, re-fetch canonical state, and `broadcast()` the new markup.
6. **Test** by running through the real workflow: navigation (anchors), SSE updates, opening/closing modals, relaunching actions after backgrounding the tab.

**Example Handler Pattern:**
```typescript
import { z } from 'zod' // or valibot, arktype, etc.

const schema = z.object({
  issue: z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
  })
})

export const POST = createHandler({
  schema,
  use: [requireAuth],
  hook: (result, c) => {
    const error = result.error[0]?.message || 'Invalid input'
    return c.var.fx.reply([['patch-signals', { error }]], { status: 400 })
  },
  async handler(c, data) {
    // data.issue is 100% type-safe
    const created = await c.var.db.insert(issues).values({
      title: data.issue.title,
      description: data.issue.description,
      authorId: c.var.user.id,
    }).returning()

    return c.var.fx.broadcast('issues:list', [
      ['patch-elements', <IssuesList issues={await fetchAllIssues(c)} />]
    ], { status: 201 })
  }
})
```

If in doubt, search the repo for an existing pattern (`LabelsSection`, `IssueModal`, comments handler) and follow it exactly.

---

By adhering to these conventions we keep Honostar predictable: every page load is deterministic, real-time updates heal themselves, and agents can ship features quickly without regressing the MPA contract. When you find a scenario not covered here, document it in this file before landing your change.
