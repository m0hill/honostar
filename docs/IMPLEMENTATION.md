# Implementation Documentation (Maintainer)

This document standardizes how we write comments and annotations across the HonoStar monorepo.
The goal is to make the codebase **self-explanatory at the right level**:

- **Public API**: “How do I use this?” (IntelliSense-first)
- **Core internals**: “Why is it built this way?” (maintenance + threat-model)
- **Apps**: “What pattern is this demonstrating?” (educational)

---

## 1) Public API (`@honostar/core`)

**Scope:** `packages/core/src/**/*.ts` exported members reachable from `@honostar/core/server` and `@honostar/core/client`.

**Goal:** When a user types `defineCommand`, they should see usage, expectations, and examples in IntelliSense.

**Standard:** Use **TSDoc** (JSDoc-compatible).

### A) Factories and “How-To” APIs

For key exports like:

- `createHandler`, `defineCommand`, `defineQueryPage`
- `createSseEndpoint`
- `registerEffect`, `registerQuery`
- `c.var.fx.reply`, `c.var.fx.broadcast`, `c.var.fx.publish`

Use:

- `@param` for every parameter (explain constraints and defaults)
- `@returns` (especially when returning `Response | FxResponse`)
- `@example` blocks (realistic, copy/pastable)

Example (domain events):

```ts
/**
 * Publish a domain event to the PubSub bus.
 *
 * This triggers any CQRS Query Handlers registered to this topic to re-run
 * and push updates to connected clients via SSE.
 *
 * @param topic - The topic(s) to publish to (e.g. `topics.issues.list()`).
 * @param name - The event name (e.g. `"issue:created"`).
 * @param payload - JSON-serializable data associated with the event.
 *
 * @example
 * // Trigger a refresh of the issue list for all connected clients
 * c.var.fx.publish(topics.issues.list(), "issue:created", { id: 123 })
 */
publish(topic: string | string[], name: string, payload?: Jsonifiable | null): void
```

### B) Types and Configuration Shapes

For config objects like `HonostarConfig`, document:

- meaning of the field
- security footguns
- defaults via `@default` when helpful

Example (CSP):

```ts
export type HonostarConfig = {
  security: {
    /**
     * Content Security Policy (CSP) string.
     *
     * Must include `'unsafe-eval'` because Datastar relies on `new Function()`
     * for expression evaluation.
     *
     * Use `${nonce}` as a placeholder to inject the per-request nonce.
     *
     * @default "script-src 'self' 'unsafe-eval' 'nonce-${nonce}';"
     */
    csp: string
  }
}
```

---

## 2) Core Internals (Maintenance / “Why”)

**Scope:** `packages/core/src/**` implementation-heavy modules.

**Goal:** Explain “why” and tradeoffs. Avoid narrating what the code obviously does.

### A) File Headers (“Architecture Notes / Threat Model”)

Apply to “heavy” modules (SSE, security, routing, prefetch):

```ts
/**
 * [Module Name]
 *
 * [Brief responsibility]
 *
 * Architecture Notes:
 * - [Key decision 1]
 * - [Key decision 2]
 *
 * @internal
 */
```

Good candidates:

- `packages/core/src/server/sse/endpoint.ts`
- `packages/core/src/server/sse/responder.ts`
- `packages/core/src/client/prefetch.ts`
- `packages/core/src/server/router/generator.ts`

### B) Algorithmic / Ordering Rules

Whenever ordering affects correctness (route precedence, patch discipline), add a comment stating the rules.

Example (route manifest sorting):

```ts
// Sort routes so specific/static paths win over dynamic ones.
// Priority:
// 1) Fewer dynamic segments (static first)
// 2) Longer paths (more specific)
// 3) Alphabetical fallback
return entries.toSorted((a, b) => { ... })
```

---

## 3) App Layer (Demo / Starter)

**Scope:** `apps/demo`, `apps/starter`.

**Goal:** These apps are “living docs”. Comments should teach framework patterns:

- **CQRS pattern**: commands publish, queries re-render fat patches
- **Tab-scoped reply** vs **broadcast**
- When to use `hook` for validation
- Patch discipline (prefer “fat patches”)

**Standard:** “Lesson comments” (explain _why this pattern exists_).

Example (command):

```ts
export const POST = defineCommand({
  schema: issueSchema,
  use: [requireAuth],
  // HOOK: Runs on validation failure. If the request is a Datastar request,
  // reply() will return an HTTP patch response so the client can show inline errors.
  hook: (result, c) => { ... },
  async handler(c, data) {
    // CQRS: publish a domain event (shared state change).
    // Queries subscribed to this topic will re-render and broadcast canonical HTML.
    c.var.fx.publish(topics.issues.list(), "issue:created", { id: created.id })
    return c.var.fx.reply([["patch-signals", { modalOpen: false }]])
  },
})
```

---

## 4) Special Cases

### A) `createHandler` Generics / StandardSchemaV1

When types are “doing the magic”, add a short `@template` explanation:

```ts
/**
 * @template Schema - A StandardSchemaV1 compatible validator (Zod, Valibot, etc.)
 */
export function createHandler<Schema extends StandardSchemaV1>(...)
```

### B) Complex Datastar Attribute Strings in JSX

If an attribute contains non-trivial logic, move it to a constant above the component and comment there:

```ts
// We use openWhenHidden: true so the request continues even if the modal closes immediately.
const submitAction = `$createIssueModal.error=''; @post('${routes.issues.create.href()}', {openWhenHidden: true})`
```

---

## Checklist for PR Review

- Public exports include TSDoc with `@param` and a useful `@example`.
- Heavy modules have a file header with architecture notes.
- Ordering rules (sorting/precedence) are documented.
- Demo/starter code uses lesson comments to explain framework patterns.
