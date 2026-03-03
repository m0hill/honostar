# Add a Command with Validation

Use `defineCommand` (alias of `createHandler`) with a Standard Schema validator (Zod/Valibot/etc.) to parse and validate incoming data.

## 1. Define schema

```ts
import { z } from "zod"

const issueSchema = z.object({
  issue: z.object({
    title: z.string().trim().min(1, "Title is required"),
    description: z.string().optional(),
  }),
})
```

## 2. Create command with validation hook

```ts
import { defineCommand } from "@honostar/core/server"

export const POST = defineCommand({
  schema: issueSchema,
  hook: (result, c) => {
    const error = result.error[0]?.message || "Invalid input"

    if (c.var.isDatastarRequest) {
      return c.var.fx.reply([["patch-signals", { formError: error }]], { status: 400 })
    }

    return c.text(error, 400)
  },
  async handler(c, data) {
    const { issue } = data
    // mutate state...
    return c.var.fx.ok({ status: 201 })
  },
})
```

## 3. Understand data extraction behavior

`defineCommand` automatically extracts request data before validation:

- `GET`: query params + optional `datastar` query JSON
- JSON requests: `c.req.json()`
- Form requests: `c.req.parseBody({ all: true })` with nested key expansion
- Unknown content types: best-effort parse

## 4. Publish event for shared updates

For shared state changes, publish domain events after mutation:

```ts
await c.var.fx.publish("issues:list", "issue:created", { id: created.id })
return c.var.fx.ok()
```

If you have contracts:

```ts
await c.var.fx.publish(issueCreatedContract, { id: created.id })
```

## 5. Return local feedback with `reply()`

Use `reply()` for tab-scoped UX only:

```ts
return c.var.fx.reply([
  ["toast:show", "Issue created", "success"],
  ["patch-signals", { createIssueModal: { open: false } }],
])
```

## Common pitfalls

- Do not use `reply()` as your only shared-state update mechanism.
- Do not broadcast optimistic guesses to all tabs.
- Do not skip validation hooks for user-facing form errors.
