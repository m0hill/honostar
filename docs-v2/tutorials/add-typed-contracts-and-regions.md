# Add Typed Contracts and Regions

This tutorial extends a working HonoStar page with two production-grade practices:

- Typed event contracts.
- Region-based patch discipline.

You will replace stringly event payloads and selector patching with safer APIs.

## Prerequisites

- Completed: [Build a Live Page with CQRS + SSE](./build-a-live-issues-page.md)
- Existing query page + command flow

## Step 1: Define contracts

In a contract module (or your app container), define topic events:

```ts
import { defineContracts, topic } from "@honostar/core/server"
import { z } from "zod"

export const issueCreated = topic("issues:list").event(
  "issue:created",
  z.object({
    id: z.number().int().positive(),
  })
)

export const contracts = defineContracts(() => [issueCreated] as const)
```

This registers schema metadata used by `validateEventContract` during publish/receive.

## Step 2: Publish with contract-aware typing

In your command:

```ts
await c.var.fx.withContracts(contracts).publish("issues:list", "issue:created", { id: created.id })
```

Or use the contract object directly:

```ts
await c.var.fx.publish(issueCreated, { id: created.id })
```

Both approaches enforce payload shape at compile time, and runtime validation can warn/throw depending on `HONOSTAR_EVENT_CONTRACTS`.

## Step 3: Declare and render regions

Declare regions in `defineQueryPage`:

```ts
regions: [
  { id: "issues:list" },
  { id: "ui:toasts", selector: "#toast-container", allowModes: ["append"] },
]
```

Render canonical content with `Region` or `regionAttrs`:

```tsx
import { Region } from "@honostar/core/server"
;<Region id="issues:list">
  <IssuesList issues={issues} />
</Region>
```

## Step 4: Patch by region ID, not selector

In query handlers, return region patches:

```ts
return [patchRegion("issues:list", <IssuesList issues={allIssues} />)]
```

Avoid patching region selectors directly:

```ts
// Avoid as default for canonical regions
["patch-elements", <IssuesList issues={allIssues} />, { selector: "#honostar-region--..." }]
```

Why this matters:

- Region IDs stay stable through DOM/layout refactors.
- Policy checks can warn/error for unsafe incremental modes.
- Query code remains semantic.

## Step 5: Use incremental modes only where appropriate

For overlays and toasts, incremental modes are fine:

```ts
return c.var.fx.reply([
  ["patch-elements", <Toast />, { selector: "#toast-container", mode: "append" }],
])
```

For canonical shared state, prefer fat patches (`outer`/`replace`/`inner`) returned from queries.

## Step 6: Enable stricter discipline in CI/staging

Set:

```bash
HONOSTAR_REGION_PATCH_DISCIPLINE=strict
```

Now disallowed incremental region patches throw instead of warn.

## Result

You now have:

- Type-safe domain events.
- Runtime contract enforcement hooks.
- Safer region-based patching with policy controls.

Next, apply these patterns with task-focused guides in [How-to](../how-to/README.md).
