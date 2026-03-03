import { describe, expect, test } from "bun:test"
import { Hono } from "hono"
import type { AppEnv } from "./context"
import { isDatastarRequest } from "./request"

describe("isDatastarRequest", () => {
  test("returns true when the datastar header is present", async () => {
    const app = new Hono<AppEnv>()
    app.get("/", (c) => c.json({ isDatastar: isDatastarRequest(c) }))

    const res = await app.request("/", {
      headers: { "Datastar-Request": "true" },
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ isDatastar: true })
  })

  test("returns false when the datastar header is missing", async () => {
    const app = new Hono<AppEnv>()
    app.get("/", (c) => c.json({ isDatastar: isDatastarRequest(c) }))

    const res = await app.request("/")

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ isDatastar: false })
  })
})
