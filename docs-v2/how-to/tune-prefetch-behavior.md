# Tune Prefetch Behavior

Use this guide to control prefetch policy in standard bootstrap apps.

## 1. Access prefetch client

With `@honostar/standard/client/bootstrap/standard`, prefetch is available at:

```ts
window.Honostar.prefetch
```

## 2. Configure global policy

```ts
window.Honostar.prefetch.configure({
  enabled: true,
  attachAllAnchors: false,
  defaultStrategy: "none",
  respectDataSaver: true,
  respectSlowConnections: true,
  defaultTTLms: 60_000,
})
```

## 3. Opt in per link with data attributes

```html
<a href="/issues/42" data-prefetch="hover" data-prefetch-method="link" data-prefetch-ttl="30000">
  Issue 42
</a>
```

Supported attributes include:

- `data-prefetch`: `hover | intent | visible | immediate | tap | none | off`
- `data-prefetch-method`: `link | fetch`
- `data-prefetch-kind`: `document | script | style | image | font | fetch`
- `data-prefetch-priority`: `high | low | auto`
- `data-prefetch-ttl`: milliseconds
- `data-prefetch-allow-cross-origin`

## 4. Programmatic prefetch

```ts
await window.Honostar.prefetch.prefetch("/issues/42", {
  method: "fetch",
  ttlMs: 30_000,
})
```

## 5. Invalidate stale entries

```ts
window.Honostar.prefetch.invalidate("/issues/42")
```

## Guidance

- Keep same-origin only unless you explicitly need cross-origin.
- Respect constrained network defaults for user safety.
- Use explicit opt-in mode (`attachAllAnchors: false`) for large applications.
