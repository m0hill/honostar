import { serve } from "@hono/node-server"
import { serveStatic } from "@hono/node-server/serve-static"
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
  MemoryBus,
  mountRoutes,
  type QueryRegistration,
  renderer,
} from "@honostar/core/server"
import { honostarLogging } from "@honostar/logging"
import { Hono } from "hono"
import { compress } from "hono/compress"

import "@honostar/core/server/polyfills/compression.js"
import "./lib/app"

import { fileURLToPath } from "node:url"
import { routesManifest } from "./generated/routes.manifest"

const config = createConfig({
  assets: {
    css: "/assets/styles.css",
    runtime: "/assets/runtime.js",
    datastar: "/assets/datastar.js",
    plugins: [],
  },
})

const app = new Hono<AppEnv>()
const bus = new MemoryBus()
const publicRoot = fileURLToPath(new URL("../public", import.meta.url))
const distRoot = fileURLToPath(new URL("../dist", import.meta.url))

app.notFound(createNotFoundHandler())
app.onError(
  createOnErrorHandler({
    showStack: process.env.NODE_ENV !== "production",
  })
)

app.use("/assets/*", serveStatic({ root: distRoot }))
app.use("/*", serveStatic({ root: publicRoot }))

app.use(
  "*",
  honostarLogging({
    base: { service: "honostar-starter" },
  })
)
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

serve(
  {
    fetch: app.fetch,
    port: Number(process.env.PORT ?? 3000),
  },
  (info) => {
    console.log(`Listening on http://localhost:${info.port}`)
  }
)
