# Prefetch Client Guide

The Prefetch Client lives entirely inside `src/core/` and powers all navigation prefetching logic for Bonsai apps. It keeps the app server-rendered while giving you fine-grained control over when and how URLs are preloaded. This document explains how it works, how to configure it globally, how to opt individual links in or out, and how to use the programmatic APIs.

---

## 1. Mental Model

- **Server remains the source of truth.** Prefetching just warms the browser cache so full navigations feel faster.
- **Multi-page architecture.** Prefetched documents are still rendered by the server; the client never mutates routing logic.
- **Policy + anchors + APIs.** A single `PrefetchClient` instance enforces a global policy, wires up anchor tags, maintains a TTL cache, and exposes a small API surface on `window.Bonsai.prefetch`.

---

## 2. Default Behavior

During bootstrap (`src/core/client-runtime.ts`) we instantiate the client with the legacy defaults:

```ts
const prefetch = createPrefetchClient({
  enabled: true,
  attachAllAnchors: true,
  defaultStrategy: 'hover',
  respectDataSaver: true,
  respectSlowConnections: true,
})
prefetch.start()
window.Bonsai = window.Bonsai ?? {}
window.Bonsai.prefetch = prefetch
```

This means:
- All same-origin `<a>` tags automatically get hover-based prefetch.
- Prefetching pauses on `Save-Data` or 2G/slow-2g connections.
- Links with `target`, `download`, or cross-origin destinations are ignored unless explicitly enabled.

You can change these defaults at runtime (see §4).

---

## 3. Configuring Global Policy

Call `window.Bonsai.prefetch.configure(partialPolicy)` anytime to override defaults. Available knobs (from `PrefetchPolicy`):

| Option | Type | Description |
| --- | --- | --- |
| `enabled` | `boolean` | Master switch for the client. |
| `onlySameOrigin` | `boolean` | Skip cross-origin URLs unless a link opts in (`data-prefetch-allow-cross-origin`). |
| `respectDataSaver` / `respectSlowConnections` | `boolean` | Gate prefetched requests when `navigator.connection` says the user is on a constrained network. |
| `defaultStrategy` | `'none' \| 'hover' \| 'intent' \| 'visible' \| 'immediate' \| 'tap'` | Strategy assigned to anchors that lack `data-prefetch`. |
| `attachAllAnchors` | `boolean` | If `false`, only `data-prefetch="..."` links get handlers. |
| `hoverDelayMs`, `intentDelayMs` | `number` | Debounce before triggering hover or intent strategies. |
| `visibleRootMargin` | `string` | IntersectionObserver root margin for `visible` strategy. |
| `maxEntries` | `number` | Maximum cached URLs before evicting the oldest. |
| `defaultTTLms` | `number` | Default TTL (5 minutes) for cached entries. |
| `useLinkRel` | `boolean` | Choose `<link rel="prefetch">` (true) or `fetch` (false) as the default method. |
| `watchMutations` | `boolean` | Auto-bind anchors that enter the DOM later via `MutationObserver`. |

### Examples

```js
// Opt-in only: disable automatic hover wiring.
window.Bonsai.prefetch.configure({
  attachAllAnchors: false,
  defaultStrategy: 'none',
})

// Aggressive document-level intents with a shorter TTL.
window.Bonsai.prefetch.configure({
  defaultStrategy: 'intent',
  defaultTTLms: 60_000,
})
```

---

## 4. Per-Link Controls via `data-*`

Any anchor can override global policy with data attributes:

| Attribute | Values | Effect |
| --- | --- | --- |
| `data-prefetch` | `hover`, `intent`, `visible`, `immediate`, `tap`, `none`, `off` | Chooses the strategy for that link. `off`/`none` disable prefetch. |
| `data-prefetch-method` | `link` &#124; `fetch` | Uses `<link rel="prefetch">` or `fetch()` even if the default differs. |
| `data-prefetch-kind` | `document`, `script`, `style`, `image`, `font`, `fetch` | Sets the `as` attribute when using `<link rel="prefetch">`. |
| `data-prefetch-ttl` | Number (ms) | Overrides TTL for this URL. |
| `data-prefetch-priority` | `low`, `high`, `auto` | Sets the `importance` hint on the generated `<link>`. |
| `data-prefetch-url` | URL string | Prefetches a different resource than the `href` (useful for `/print` versions, etc.). |
| `data-prefetch-allow-cross-origin` | empty, `true`, `1` | Allows prefetching cross-origin even if the global policy normally blocks it. |

**Example**

```html
<a href="/issues/42" data-prefetch="visible" data-prefetch-ttl="30000">
  Issue 42
</a>

<a
  href="/profile"
  data-prefetch="hover"
  data-prefetch-method="fetch"
  data-prefetch-priority="high"
>
  Profile
</a>

<a href="https://cdn.example.com/docs" data-prefetch="hover" data-prefetch-allow-cross-origin>
  External Docs
</a>
```

---

## 5. Programmatic APIs

The global instance is accessible at `window.Bonsai.prefetch`. Useful methods include:

| Method | Description |
| --- | --- |
| `configure(partialPolicy)` | Merge new policy settings (see §3). |
| `start(root?)` / `stop()` | Manually start or stop binding (already called during bootstrap). |
| `bindAnchors(root?)` | Scan and wire anchors inside `root` (defaults to `document`). Handy after injecting HTML via SSE/Datastar if you disabled `watchMutations`. |
| `prefetch(url, options?)` | Programmatically prefetch anything. Accepts `PrefetchOptions` (`method`, `kind`, `priority`, `ttlMs`, `signal`, `allowCrossOrigin`, `crossOrigin`). |
| `invalidate(urlOrPredicate)` | Remove cached entries by exact URL or predicate function. |
| `isPrefetched(url)` | Returns `true` if the cache has a fresh entry for that absolute URL. |
| `preconnect(origin)` | Adds `<link rel="preconnect">` for the provided origin. |

### Programmatic Examples

```js
// Fetch navigation HTML immediately.
window.Bonsai.prefetch.prefetch('/issues/42', {
  method: 'link',
  kind: 'document',
  ttlMs: 120_000,
})

// Invalidate whenever you know the server content changed.
window.Bonsai.prefetch.invalidate('/issues/42')

// Warm up a CDN before loading assets.
window.Bonsai.prefetch.preconnect('https://cdn.example.com')

// Prefetch dynamically added links inside a modal you just rendered.
const modal = document.getElementById('issue-modal')
window.Bonsai.prefetch.bindAnchors(modal)
```

---

## 6. Caching & Network Behavior

- **TTL cache.** Each entry remembers its expiry and prefetch method. The cache holds up to `maxEntries` URLs (default 200) and prunes the oldest when full. Successful `<link rel="prefetch">` loads resolve quickly; failures back off for 10s before retry.
- **Network awareness.** If `navigator.connection.saveData` is true, or `effectiveType` reports `2g`/`slow-2g`, the client defers prefetching when `respectDataSaver`/`respectSlowConnections` are enabled.
- **Abort support.** Programmatic calls can pass an `AbortSignal`. Pointer-based strategies reuse the cache so the same link won’t spawn duplicates.

---

## 7. Common Recipes

### Make Prefetching Explicit Only

```html
<script>
  window.Bonsai.prefetch.configure({
    attachAllAnchors: false,
    defaultStrategy: 'none',
  })
</script>

<!-- Opt-in via data-prefetch -->
<a href="/issues/1" data-prefetch="hover">Issue 1</a>
```

### Intent-Based Mobile Prefetch

```js
window.Bonsai.prefetch.configure({
  defaultStrategy: 'tap', // pointerdown/touchstart triggers
  hoverDelayMs: 60,
  intentDelayMs: 0,
})
```

### Prefetch Related Documents When a Page Loads

```js
const related = ['/issues/41', '/issues/42', '/issues/43']
related.forEach(url => {
  window.Bonsai.prefetch.prefetch(url, { method: 'fetch', ttlMs: 30_000 })
})
```

---

## 8. Troubleshooting

- **Nothing happens on hover:** Verify `window.Bonsai.prefetch` exists, `policy.enabled` is true, and the link is same-origin without `target`/`download`.
- **Prefetch blocked:** Check if `navigator.connection.saveData` or `effectiveType` triggers throttling. Override with `respectDataSaver: false`.
- **Custom DOM injections:** If you disable `watchMutations`, call `bindAnchors()` after adding content.
- **Cross-origin resources:** Set `data-prefetch-allow-cross-origin` on the link or pass `allowCrossOrigin: true` in programmatic calls, and set `crossOrigin` if credentials are required.

With these tools, you can tailor prefetching to each workflow—speeding up common navigations while keeping full control over network usage. Add new recipes or clarifications here as the platform evolves. Happy prefetching!
