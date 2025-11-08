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

## 10. Workflow Checklist

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
12. **Lint + typecheck** (`bun run lint`, `bun run typecheck`) succeed locally; include results in your summary if requested.

---

## 11. Quick Start for New Features

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

By adhering to these conventions we keep Bonsai predictable: every page load is deterministic, real-time updates heal themselves, and agents can ship features quickly without regressing the MPA contract. When you find a scenario not covered here, document it in this file before landing your change.***
