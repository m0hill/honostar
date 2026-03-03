# Add Query Re-rendering over SSE

This guide wires a topic to query handlers so domain events trigger canonical region re-renders.

## 1. Create a query handler

```ts
import { patchRegion, type QueryHandler } from "@honostar/core/server"

export const issuesListQuery: QueryHandler = async ({ c }) => {
  const allIssues = await c.var.db.query.issues.findMany()
  return [patchRegion("issues:list", <IssuesList issues={allIssues} />)]
}
```

## 2. Register query on a page

```ts
import { defineQueryPage } from "@honostar/core/server"

export default defineQueryPage({
  topics: ["issues:list"],
  queries: [["issues:list", issuesListQuery]],
  regions: [{ id: "issues:list" }],
  loader: async (c) => ({
    issues: await c.var.db.query.issues.findMany(),
  }),
  component: (props) => <IssuesPage issues={props.issues} />,
})
```

## 3. Ensure SSE endpoint receives collected queries

```ts
const collectedQueries: QueryRegistration[] = []
await mountRoutes(app, createManifestRouteLoader(routesManifest), {
  collect: { queries: collectedQueries },
})

app.get("/_/events", createSseEndpoint(config, { queries: collectedQueries }))
```

## 4. Publish from command

```ts
await c.var.fx.publish("issues:list", "issue:created", { id: issue.id })
return c.var.fx.ok()
```

Now every connected client subscribed to `issues:list` gets query-driven fat patches.

## 5. Pattern-based topics (optional)

For dynamic topics, use regex registration:

```ts
queries: [[/^issue:(?<id>\d+):comments$/, issueCommentsQuery]]
```

When using pattern queries, you still need explicit `topics` on the page because SSE subscriptions require concrete topic names.

## 6. Shared query coalescing (hot topics)

Enable query coalescing when output is identical across subscribers:

```ts
queries: [["issues:list", issuesListQuery, { shared: true, cacheMs: 250 }]]
```

Use only when the rendered output is truly shared for the same key.

## Troubleshooting

- If updates only appear in one tab, verify you used `publish(...)`, not only `reply(...)`.
- If no updates appear, verify `/_/events` is mounted and topics are authorized.
- If updates are stale after reconnect, make sure queries return full region markup (fat patches).
