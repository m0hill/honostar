```txt
npm install
npm run dev
```

This app is wired to HonoStar Cloudflare adapter:

- `/_/events` uses `createCloudflareSseEndpoint()` (browser SSE, DO hub fanout)
- Durable Object binding: `HONOSTAR_SSE_HUB`

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
