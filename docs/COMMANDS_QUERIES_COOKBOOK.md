# Commands + Queries Cookbook

Practical patterns for HonoStar CQRS apps.

## 1) `reply()` vs `publish()` vs `broadcast()`

- `reply(...)`: tab-scoped UX feedback only (validation errors, modal close, toasts).
- `publish(...)`: shared state changed; emit a domain event and let queries re-render canonical HTML.
- `broadcast(...)`: direct shared effect fanout. Prefer this for exceptional cases; canonical UI should usually come from queries.

Rule:

- Shared state mutation -> `publish(...)`.
- Immediate local feedback -> `reply(...)`.

## 2) Command Validation Hooks

Use `hook` for schema failures and keep behavior symmetrical:

```ts
hook: (result, c) => {
  const error = result.error[0]?.message || "Invalid input"
  if (c.var.isDatastarRequest) {
    return c.var.fx.reply([["patch-signals", { formError: error }]], { status: 400 })
  }
  return c.text(error, 400)
}
```

Guidance:

- Datastar path: patch signals/elements in-place.
- Non-Datastar path: return HTTP fallback (`text`, redirect, or full page).

## 3) Modal + Toast Pattern

Commands:

- Publish domain event(s) for shared state updates.
- Reply with local UX effects for the initiating tab.

```ts
await c.var.fx.publish(topics.issues.list(), "issue:created", { id: created.id })

return c.var.fx.reply([
  ["toast:show", "Issue created", "success"],
  [
    "patch-elements",
    "",
    { selector: '#ds-overlays [data-modal-id="create-issue"]', mode: "remove" },
  ],
  ["patch-signals", { issueForm: { title: "", description: "" } }],
])
```

## 4) Optimistic (Tab-Only) Pattern

If latency is noticeable:

- Send optimistic UI only with `reply(...)`.
- Still publish the canonical domain event.
- Query fat patch must overwrite optimistic state.

Never broadcast optimistic guesses to other tabs.

## 5) Fat Patch Guidance

Queries should re-fetch canonical server state and return full-region patches.

Prefer:

- `patchRegion("issues:list", <IssuesList issues={allIssues} />)`

Avoid by default:

- `append`/`prepend` except true incremental streams (chat, infinite scroll).

## 6) Region Authoring Standard

Use region APIs consistently:

- Render regions with `Region` or `regionAttrs(...)`.
- Patch regions with `patchRegion(...)`/`patchRegionSeq(...)`.

Avoid direct selector patching for regions:

- `["patch-elements", ..., { selector: "[data-honostar-region='issues:list']" }]`

In dev, HonoStar warns when `patch-elements` targets a region-like selector that is not registered in the request registry.

## 7) Registration Checklist

- Install middleware in order:
  1. `initContext`
  2. `fxResponder`
  3. route mounting
- Mount SSE endpoint:
  - `app.get("/_/events", createSseEndpoint(config, { queries }))`
- In production, set topic-signing secret (`HONOSTAR_SIGNING_SECRET` by default).
