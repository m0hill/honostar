import { describe, expect, test } from "bun:test"
import { Hono } from "hono"
import { honostarLogging, log } from "./logging"

describe("@honostar/logging", () => {
  test("emits a single wide event with enrichments", async () => {
    const events: any[] = []
    const app = new Hono()

    app.use(
      "*",
      honostarLogging({
        includeErrorStack: false,
        logger: {
          info: (obj) => events.push(obj),
          error: (obj) => events.push(obj),
        },
        base: { service: "test" },
      })
    )

    app.get("/ok", async (c) => {
      log.add({ user: { id: "u_123" } })
      await log.span("work", async () => {
        await Promise.resolve()
      })
      return c.text("ok")
    })

    const res = await app.request("http://localhost/ok", {
      headers: { "x-request-id": "req_abc" },
    })

    expect(res.status).toBe(200)
    expect(events).toHaveLength(1)

    const evt = events[0] as any
    expect(evt.request_id).toBe("req_abc")
    expect(evt.method).toBe("GET")
    expect(evt.path).toBe("/ok")
    expect(evt.service).toBe("test")
    expect(evt.user.id).toBe("u_123")
    expect(evt.outcome).toBe("success")
    expect(evt.status_code).toBe(200)
    expect(evt.duration_ms).toBeTypeOf("number")
    expect(evt.spans?.[0]?.name).toBe("work")
  })

  test("logs errors as a wide event", async () => {
    const events: any[] = []
    const app = new Hono()

    app.use(
      "*",
      honostarLogging({
        includeErrorStack: false,
        logger: {
          info: (obj) => events.push(obj),
          error: (obj) => events.push(obj),
        },
      })
    )

    app.get("/boom", () => {
      throw new Error("boom")
    })

    const res = await app.request("http://localhost/boom")

    expect(res.status).toBe(500)
    expect(events).toHaveLength(1)
    const evt = events[0] as any
    expect(evt.outcome).toBe("error")
    expect(evt.error?.message).toBe("boom")
  })
})
