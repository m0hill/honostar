import { Hono } from "hono"
import {
  createConfig,
  csrf,
  fxResponder,
  initContext,
  patchRegion,
  renderer,
  type EffectDefinition,
  type QueryHandler,
  type QueryRegistration,
} from "@honostar/core/server"
import {
  createCloudflareDurableObjectBus,
  createCloudflareSseEndpoint,
} from "@honostar/cloudflare/server"
import { BoardRegionPatch, Home, StatsRegion } from "./components"
import {
  BOARD_SIZE,
  DEFAULT_VIEW_COLS,
  DEFAULT_VIEW_ROWS,
  REGION_BOARD,
  REGION_STATS,
  TOPIC_BOARD,
  STATE_OBJECT_NAME,
  clamp,
  clampCols,
  clampRows,
  extractViewportFromBody,
  maxXForCols,
  maxYForRows,
  parseRouteCoord,
  parseTogglePayload,
  parseViewportQuery,
  toNonNegativeInt,
  viewportContains,
} from "./domain"
import {
  getWaitUntil,
  resolveViewportForRequest,
  setViewportForClient,
  toggleCell,
} from "./state-client"
import type { WorkerEnv } from "./env"

const config = createConfig({
  assets: {
    css: "/styles.css",
    runtime: "/runtime.js",
    datastar: "/datastar.js",
    plugins: [],
  },
})

const BOARD_PATCH_OPTIONS = {
  mode: "outer",
  useViewTransition: false,
} as const

const boardQuery: QueryHandler = async ({ c, event }) => {
  const fallbackRows = clampRows(toNonNegativeInt(c.req.query("rows")) ?? DEFAULT_VIEW_ROWS)
  const fallbackCols = clampCols(toNonNegativeInt(c.req.query("cols")) ?? DEFAULT_VIEW_COLS)
  const fallbackX = clamp(toNonNegativeInt(c.req.query("x")) ?? 0, 0, maxXForCols(fallbackCols))
  const fallbackY = clamp(toNonNegativeInt(c.req.query("y")) ?? 0, 0, maxYForRows(fallbackRows))
  const snapshot = await resolveViewportForRequest(
    c,
    fallbackX,
    fallbackY,
    fallbackRows,
    fallbackCols
  )

  const effects: EffectDefinition[] = [
    patchRegion(REGION_STATS, <StatsRegion snapshot={snapshot} />),
  ]

  if (!event) {
    effects.push(
      patchRegion(REGION_BOARD, <BoardRegionPatch snapshot={snapshot} />, BOARD_PATCH_OPTIONS)
    )
    return effects
  }

  const changed = parseTogglePayload(event.payload)
  if (!changed || viewportContains(snapshot, changed.row, changed.col)) {
    effects.push(
      patchRegion(REGION_BOARD, <BoardRegionPatch snapshot={snapshot} />, BOARD_PATCH_OPTIONS)
    )
  }

  return effects
}

const collectedQueries: QueryRegistration[] = [[TOPIC_BOARD, boardQuery]]

const app = new Hono<WorkerEnv>()

app.use("*", csrf(config))
app.use("*", renderer(config))
app.use("*", initContext)

app.use("*", async (c, next) => {
  try {
    c.set(
      "bus",
      createCloudflareDurableObjectBus({
        hub: c.env.HONOSTAR_SSE_HUB,
        hubName: STATE_OBJECT_NAME,
        waitUntil: getWaitUntil(c),
      })
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
    hubName: STATE_OBJECT_NAME,
    queries: collectedQueries,
  })
)

app.get("/", async (c) => {
  const { x, y } = parseViewportQuery(c)
  const snapshot = await resolveViewportForRequest(c, x, y, DEFAULT_VIEW_ROWS, DEFAULT_VIEW_COLS)

  c.set("sseTopics", [TOPIC_BOARD])
  c.set("sseParams", {
    x: String(snapshot.x),
    y: String(snapshot.y),
    rows: String(snapshot.rows),
    cols: String(snapshot.cols),
  })

  return c.render(<Home snapshot={snapshot} />)
})

app.post("/toggle/:row/:col", async (c) => {
  const row = parseRouteCoord(c.req.param("row"))
  const col = parseRouteCoord(c.req.param("col"))
  if (row === null || col === null) return c.text("Invalid coordinates", 400)
  if (row >= BOARD_SIZE || col >= BOARD_SIZE) return c.text("Out of range", 400)

  const result = await toggleCell(c, row, col)
  await c.var.fx.publish(TOPIC_BOARD, "checkbox:toggled", result)
  return c.var.fx.ok()
})

app.post("/viewport", async (c) => {
  const clientId = c.var.clientId
  if (!clientId || clientId === "anonymous") {
    return c.text("Missing tab identity", 400)
  }

  const body = await c.req.json<unknown>().catch(() => null)
  const { x, y, rows, cols } = extractViewportFromBody(body)
  const update = await setViewportForClient(c, clientId, x, y, rows, cols)

  if (!update.changed) return c.var.fx.ok()

  return c.var.fx.reply([
    patchRegion(REGION_STATS, <StatsRegion snapshot={update.snapshot} />),
    patchRegion(REGION_BOARD, <BoardRegionPatch snapshot={update.snapshot} />, BOARD_PATCH_OPTIONS),
  ])
})

export default app
