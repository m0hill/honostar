import {
  type AppEnv,
  createConfig,
  createManifestRouteLoader,
  createNotFoundHandler,
  createOnErrorHandler,
  createSseEndpoint,
  csrf,
  fxResponder,
  initContext,
  mountRoutes,
  type QueryRegistration,
  registerEffects,
  renderer,
} from "@honostar/core/server"
import { honostarLogging, type WideEvent } from "@honostar/logging"
import { Hono } from "hono"
import type { Context } from "hono"
import { serveStatic } from "hono/bun"
import { compress } from "hono/compress"

import "@honostar/core/server/polyfills/compression.js"

// Define your application config
const config = createConfig({
  assets: {
    css: "/styles.css",
    runtime: "/runtime.js",
    datastar: "/datastar.js",
    plugins: ["/plugins.js"],
  },
})

import { customEffects } from "@/effects"
import { auth } from "@/middleware/auth"
import { attachBus } from "@/middleware/bus"
import { attachDb } from "@/middleware/db"
import { routesManifest } from "@/routes.manifest"
import "@/lib/contracts"

const app = new Hono<AppEnv>()

app.notFound(createNotFoundHandler())
app.onError(
  createOnErrorHandler({
    showStack: process.env.NODE_ENV !== "production",
  })
)

app.use("/*", serveStatic({ root: "./public" }))
app.use("/images/*", serveStatic({ root: "./" }))

app.use(
  "*",
  honostarLogging({
    base: { service: "honostar-demo" },
    enrichers: [
      (c: Context<AppEnv>, evt: WideEvent) => {
        evt.client_id = c.var.clientId
        evt.sse_topics = c.var.sseTopics ?? []
      },
    ],
  })
)

// Include SSE in compression so long-lived streams benefit from Brotli/gzip context reuse.
app.use("*", compress())

// Pass config to framework middleware
app.use("*", csrf(config))
app.use("*", renderer(config))
app.use("*", initContext)
app.use("*", attachBus)

app.use("*", fxResponder)

// Register custom effects (must be after fxResponder)
app.use("*", registerEffects(customEffects))

app.use("*", attachDb)
app.use("*", auth)

// Mount all app routes, collecting CQRS query registrations from pages as we go.
const collectedQueries: QueryRegistration[] = []
await mountRoutes(app, createManifestRouteLoader(routesManifest), {
  collect: { queries: collectedQueries },
})

app.get("/_/events", createSseEndpoint(config, { queries: collectedQueries }))

if (import.meta.main) {
  const port = Number(process.env.PORT ?? 3000)
  Bun.serve({
    fetch: app.fetch,
    port,
    // SSE connections are long-lived; disable Bun's default 10s idle timeout.
    idleTimeout: 0,
  })
  console.log(`Started development server: http://localhost:${port}`)
}

export default app
