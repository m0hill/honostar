## OVERVIEW

Full-featured demo app showcasing auth, DB, plugins, effects, CQRS.

## STRUCTURE

```
src/
├── components/     React UI components
├── db/             Drizzle schema + migrations
├── effects/        Custom server-side effects (toast)
├── lib/            Auth logic, plugins (clipboard/focus/scroll/toast)
├── middleware/     Request handlers (auth, db, bus)
├── pages/          Route handlers (dynamic+static)
└── types/          TypeScript definitions
```

## WHERE TO LOOK

- Entry point: `src/index.ts` (middleware pipeline, SSE, effects)
- Auth flow: `lib/auth.tsx` (login/signup), `middleware/auth.ts`
- Plugins: `lib/plugins/*.ts` (register runtime actions like `@clipboard`)
- Effects: `effects/toast.tsx` (server-side `toast:show`/`toast:success`)
- Commands: `pages/issues/new.tsx` (zod validation, DB writes, CQRS publish)
- Queries: See `routes.manifest.ts` and `_/events` SSE endpoint

## CONVENTIONS

- Commands use `defineCommand` with zod schema + `requireAuth` middleware
- DB access via Drizzle relations with cascade deletes
- Effects return `await c.var.fx.reply([...])` for Datastar patches
- Plugins call `registerRuntimePlugin(name, handler)`
- CQRS: commands publish to topics (`c.var.fx.publish`), queries subscribe via manifest

## ANTI-PATTERNS

- Don't skip `requireAuth` on mutation routes
- Don't use type assertions on validated command payloads
- Don't mix client/server plugin registration boundaries
- Don't publish events without corresponding query subscriptions
