# Build a Live Page with CQRS + SSE

This tutorial walks through a minimal end-to-end feature:

- A page that renders server HTML.
- A command that mutates state.
- A published domain event.
- A query that re-renders a region over SSE.

By the end, clicking a button updates all connected tabs.

## Prerequisites

- Workspace dependencies installed: `pnpm install`
- Starter app running: `pnpm dev`
- Basic familiarity with Hono route modules

## Step 1: Create app-level IDs

Create `src/lib/app.ts`:

```ts
import { createApp, defineContracts, schema, topic } from "@honostar/core/server"

const topics = {
  counter: "counter",
} as const

const regions = {
  counter: { id: "counter" },
} as const

const counterIncremented = topic(topics.counter).event(
  "counter:incremented",
  schema<{ count: number }>({
    validate(value): value is { count: number } {
      return (
        typeof value === "object" &&
        value !== null &&
        "count" in value &&
        typeof (value as { count?: unknown }).count === "number"
      )
    },
  })
)

const contracts = defineContracts(() => [counterIncremented] as const)

export const app = createApp({ topics, regions, contracts })
export const ids = app.ids
```

You now have a single source of truth for topic IDs, region IDs, and contracts.

## Step 2: Create shared server state (for this tutorial)

Create `src/state.ts`:

```ts
let counter = 0

export function getCounter() {
  return counter
}

export function incrementCounter() {
  counter += 1
  return counter
}
```

This keeps both page loader/query and command handler on the same source of truth.

## Step 3: Build a query page

Create `src/pages/index.tsx`:

```tsx
import { defineQueryPage, patchRegion, Region, type QueryHandler } from "@honostar/core/server"
import { app, ids } from "../lib/app"
import { getCounter } from "../state"

const counterQuery: QueryHandler = async () => {
  return [patchRegion(ids.regions.counter, <Counter count={getCounter()} />)]
}

function Counter(props: { count: number }) {
  return (
    <Region id={ids.regions.counter}>
      <p>Count: {props.count}</p>
    </Region>
  )
}

export default defineQueryPage({
  topics: [app.ids.topics.counter],
  queries: [[app.ids.topics.counter, counterQuery]],
  regions: [...app.regions],
  loader: async () => ({ count: getCounter() }),
  component: (props) => (
    <main>
      <h1>Counter</h1>
      <Counter count={props.count} />
      <button data-on:click="@post('/increment')">Increment</button>
    </main>
  ),
})
```

Important points:

- `topics` declares SSE subscriptions.
- `queries` maps topic events to query handlers.
- `patchRegion(...)` sends a fat patch for canonical UI.

## Step 4: Add a command endpoint

Create `src/pages/increment.tsx`:

```ts
import { defineCommand } from "@honostar/core/server"
import { app } from "../lib/app"
import { incrementCounter } from "../state"

export const POST = defineCommand({
  async handler(c) {
    const next = incrementCounter()
    await c.var.fx
      .withContracts(app.contracts)
      .publish(app.ids.topics.counter, "counter:incremented", {
        count: next,
      })
    return c.var.fx.ok()
  },
})
```

Why `ok()`?

- This command relies on CQRS query re-rendering for shared UI updates.
- It does not need tab-scoped UI feedback.

## Step 5: Ensure middleware and SSE endpoint are wired

In your server entry, you need this order:

```ts
app.use("*", csrf(config))
app.use("*", renderer(config))
app.use("*", initContext)
app.use("*", async (c, next) => {
  c.set("bus", bus)
  await next()
})
app.use("*", fxResponder)

const collectedQueries: QueryRegistration[] = []
await mountRoutes(app, createManifestRouteLoader(routesManifest), {
  collect: { queries: collectedQueries },
})

app.get("/_/events", createSseEndpoint(config, { queries: collectedQueries }))
```

## Step 6: Verify behavior

1. Open two browser tabs on the page.
2. Click **Increment** in one tab.
3. Both tabs should update.

What happened:

1. Command mutated state.
2. Command published `counter:incremented` on topic `counter`.
3. SSE endpoint ran registered query for that topic.
4. Query returned `patch-region` effect.
5. Both tabs patched the same canonical region.

## What to learn from this tutorial

- Commands own mutation and event publication.
- Queries own canonical UI re-rendering.
- Regions + fat patches make reconnect/missed-event recovery practical.

Next tutorial: [Add Typed Contracts and Regions](./add-typed-contracts-and-regions.md)
