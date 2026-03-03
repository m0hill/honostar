```txt
npm install
npm run dev
```

This app is a Cloudflare "One Billion Checkboxes" demo wired to HonoStar:

- `/_/events` uses `createCloudflareSseEndpoint()` (browser SSE, DO hub fanout)
- Durable Object binding: `HONOSTAR_SSE_HUB`
- Durable Object SQLite state store: `BILLION_CHECKBOXES_STATE`

Behavior:

- Conceptual board size: `1,000,000,000` cells (`31623 x 31623`)
- Sparse chunked persistence (`32 x 32` chunks, only non-empty chunks stored)
- Realtime sync across tabs via topic broadcasts + query re-renders
- Viewport navigation via query params (`/?x=...&y=...`)

Optional (recommended in prod): set `HONOSTAR_SIGNING_SECRET` so topic allowlist is enforced.

```txt
npm run deploy
```

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
npm run cf-typegen
```

Pass the `CloudflareBindings` as generics when instantiation `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```
