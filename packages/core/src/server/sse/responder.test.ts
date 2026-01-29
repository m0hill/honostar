import { describe, expect, test } from "bun:test"
import { Hono } from "hono"
import type { AppEnv } from "../context"
import { MemoryBus } from "./pubsub/memory"
import { fxResponder } from "./responder"

describe("FxResponder HTTP patch headers", () => {
  test("includes datastar-namespace when provided", async () => {
    const bus = new MemoryBus()
    const app = new Hono<AppEnv>()

    app.use("*", async (c, next) => {
      c.set("clientId", "client-1")
      c.set("bus", bus)
      await next()
    })
    app.use("*", fxResponder)

    app.post("/action", async (c) => {
      return await c.var.fx.reply([
        [
          "patch-elements",
          '<svg><circle cx="0" cy="0" r="10"></circle></svg>',
          {
            selector: "#icon",
            namespace: "svg",
          },
        ],
      ])
    })

    const res = await app.request("/action", {
      method: "POST",
      headers: {
        "Datastar-Request": "true",
      },
    })

    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toContain("text/html")
    expect(res.headers.get("datastar-namespace")).toBe("svg")
  })
})
