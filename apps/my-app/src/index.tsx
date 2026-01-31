import type { Context } from "hono"
import { Hono } from "hono"
import {
  createConfig,
  csrf,
  fxResponder,
  initContext,
  patchRegion,
  renderer,
  type AppEnv,
  type QueryHandler,
  type QueryRegistration,
} from "@honostar/core/server"
import {
  createCloudflareDurableObjectBus,
  createCloudflareSseEndpoint,
} from "@honostar/cloudflare/server"

export { CloudflareBusHub } from "@honostar/cloudflare/server"

const TOPIC_COUNTER = "demo:counter"
const REGION_COUNTER = "demo:counter"

let counter = 0

const counterQuery: QueryHandler = async () => {
  return [patchRegion(REGION_COUNTER, <Counter count={counter} />)]
}

const collectedQueries: QueryRegistration[] = [[TOPIC_COUNTER, counterQuery]]

const config = createConfig({
  assets: {
    css: "/styles.css",
    runtime: "/runtime.js",
    datastar: "/datastar.js",
    plugins: [],
  },
})

const app = new Hono<AppEnv>()

app.use("*", csrf(config))
app.use("*", renderer(config))
app.use("*", initContext)

app.use("*", async (c, next) => {
  const hub = getBinding(c, "HONOSTAR_SSE_HUB")
  if (!hub) return c.text("Missing Durable Object binding: HONOSTAR_SSE_HUB", 500)
  try {
    c.set(
      "bus",
      createCloudflareDurableObjectBus({ hub, hubName: "shared", waitUntil: getWaitUntil(c) })
    )
  } catch (err) {
    console.error("[my-app] Failed to init Cloudflare DO bus", err)
    return c.text("Failed to init Cloudflare DO bus", 500)
  }
  await next()
})

app.use("*", fxResponder)

app.get(
  "/_/events",
  createCloudflareSseEndpoint({
    hubName: "shared",
    queries: collectedQueries,
  })
)

app.get("/", (c: Context<AppEnv>) => {
  c.set("sseTopics", [TOPIC_COUNTER])
  return c.render(<Home count={counter} />)
})

app.post("/increment", async (c: Context<AppEnv>) => {
  counter++
  await c.var.fx.publish(TOPIC_COUNTER, "counter:changed", { count: counter })
  return c.var.fx.ok()
})

function Home(props: { count: number }) {
  return (
    <main style="padding: 24px; max-width: 720px; margin: 0 auto;">
      <h1>HonoStar Cloudflare Starter</h1>
      <p>Server-rendered HTML + SSE patches (DO hub fanout).</p>

      <Counter count={props.count} />

      <div style="margin-top: 16px;">
        <button data-on:click="@post('/increment')">Increment</button>
      </div>
    </main>
  )
}

function Counter(props: { count: number }) {
  return (
    <section data-honostar-region={REGION_COUNTER} data-honostar-region-kind="card">
      <h2>Counter</h2>
      <p>Value: {props.count}</p>
    </section>
  )
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function getWaitUntil(c: unknown): ((promise: Promise<unknown>) => void) | undefined {
  if (!isPlainRecord(c)) return undefined
  const executionCtx: unknown = c.executionCtx
  if (!isPlainRecord(executionCtx)) return undefined
  const waitUntil: unknown = executionCtx.waitUntil
  if (typeof waitUntil !== "function") return undefined
  return (promise: Promise<unknown>) => {
    try {
      waitUntil.call(executionCtx, promise)
    } catch (err) {
      console.error("[my-app] executionCtx.waitUntil failed", err)
    }
  }
}

function getBinding(c: Context<AppEnv>, name: string): unknown | null {
  const env: unknown = c.env
  if (!isPlainRecord(env)) return null
  return name in env ? env[name] : null
}

export default app
