# Bootstrap a HonoStar App

Use this guide to wire a complete HonoStar server with route mounting, SSE, and core middleware.

## 1. Install dependencies

At workspace root:

```bash
pnpm install
```

## 2. Add app scripts

In your app `package.json`, use the CLI:

```json
{
  "scripts": {
    "dev": "honostar dev",
    "start": "honostar start"
  }
}
```

`honostar dev` runs deps build, codegen (`prepare`), Vite watch, and server dev command.

## 3. Configure `honostar` in package.json

Example:

```json
{
  "honostar": {
    "depsBuild": ["@honostar/core"],
    "routes": {
      "pagesDir": "src/pages",
      "manifestPath": "src/generated/routes.manifest.ts",
      "routesPath": "src/generated/routes.ts"
    },
    "contracts": {
      "contractsImportPath": "../lib/contracts",
      "outPath": "src/generated/contracts.ts"
    },
    "server": {
      "dev": "tsx watch src/index.ts",
      "start": "tsx src/index.ts"
    }
  }
}
```

## 4. Wire the server entry

`src/index.ts`:

```ts
import { Hono } from "hono"
import { compress } from "hono/compress"
import {
  type AppEnv,
  createConfig,
  createManifestRouteLoader,
  createSseEndpoint,
  csrf,
  fxResponder,
  initContext,
  MemoryBus,
  mountRoutes,
  type QueryRegistration,
  renderer,
} from "@honostar/core/server"
import { routesManifest } from "./generated/routes.manifest"

const config = createConfig()

const app = new Hono<AppEnv>()
const bus = new MemoryBus()

app.use("*", compress())
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

Middleware order above is the standard baseline.

## 5. Add client bootstrap

Minimal runtime in your client entry:

```ts
import "@honostar/core/client/bootstrap/minimal"
```

Or standard runtime bundle:

```ts
import "@honostar/standard/client/bootstrap/standard"
```

## 6. Run

```bash
pnpm dev
```

You should have:

- server-rendered page responses
- `/_/events` SSE endpoint
- `X-Tab-ID` and CSRF fetch augmentation
- route/codegen integrated into dev flow
