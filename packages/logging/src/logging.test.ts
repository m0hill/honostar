import { describe, expect, test } from "bun:test"
import { Hono } from "hono"
import { createError } from "./error"
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

  test("includes structured error hints from createError", async () => {
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

    app.get("/checkout", () => {
      throw createError({
        message: "Payment failed",
        status: 402,
        why: "Card declined",
        fix: "Use another payment method",
        link: "https://docs.example.com/payments",
      })
    })

    const res = await app.request("http://localhost/checkout")
    expect(res.status).toBe(500)
    expect(events).toHaveLength(1)

    const evt = events[0] as any
    expect(evt.error?.message).toBe("Payment failed")
    expect(evt.error?.why).toBe("Card declined")
    expect(evt.error?.fix).toBe("Use another payment method")
    expect(evt.error?.link).toBe("https://docs.example.com/payments")
  })

  test("applies include/exclude route filtering", async () => {
    const events: any[] = []
    const app = new Hono()

    app.use(
      "*",
      honostarLogging({
        include: ["/api/**"],
        exclude: ["/api/health"],
        logger: {
          info: (obj) => events.push(obj),
          error: (obj) => events.push(obj),
        },
      })
    )

    app.get("/api/users", (c) => c.text("ok"))
    app.get("/api/health", (c) => c.text("ok"))
    app.get("/public", (c) => c.text("ok"))

    await app.request("http://localhost/api/users")
    await app.request("http://localhost/api/health")
    await app.request("http://localhost/public")

    expect(events).toHaveLength(1)
    expect(events[0]?.path).toBe("/api/users")
  })

  test("supports head sampling by level", async () => {
    const events: any[] = []
    const app = new Hono()

    app.use(
      "*",
      honostarLogging({
        sampling: {
          rates: { info: 0 },
        },
        logger: {
          info: (obj) => events.push(obj),
          error: (obj) => events.push(obj),
        },
      })
    )

    app.get("/sampled-out", (c) => c.text("ok"))
    await app.request("http://localhost/sampled-out")

    expect(events).toHaveLength(0)
  })

  test("supports tail keep callback overriding head sampling", async () => {
    const events: any[] = []
    const app = new Hono()

    app.use(
      "*",
      honostarLogging({
        sampling: {
          rates: { info: 0 },
        },
        keep: (ctx) => {
          if (ctx.path === "/force-keep") ctx.shouldKeep = true
        },
        logger: {
          info: (obj) => events.push(obj),
          error: (obj) => events.push(obj),
        },
      })
    )

    app.get("/force-keep", (c) => c.text("ok"))
    await app.request("http://localhost/force-keep")

    expect(events).toHaveLength(1)
    expect(events[0]?.path).toBe("/force-keep")
  })

  test("classifies 4xx responses as warn level", async () => {
    const events: any[] = []
    const app = new Hono()

    app.use(
      "*",
      honostarLogging({
        logger: {
          info: (obj) => events.push(obj),
          error: (obj) => events.push(obj),
        },
      })
    )

    app.get("/not-allowed", (c) => c.text("nope", 403))
    const res = await app.request("http://localhost/not-allowed")

    expect(res.status).toBe(403)
    expect(events).toHaveLength(1)
    expect(events[0]?.level).toBe("warn")
  })

  test("does not fail request if keep hook throws", async () => {
    const events: any[] = []
    const app = new Hono()

    app.use(
      "*",
      honostarLogging({
        keep: () => {
          throw new Error("keep hook failed")
        },
        logger: {
          info: (obj) => events.push(obj),
          error: (obj) => events.push(obj),
        },
      })
    )

    app.get("/keep-throws", (c) => c.text("ok"))
    const res = await app.request("http://localhost/keep-throws")

    expect(res.status).toBe(200)
    expect(events).toHaveLength(1)
  })

  test("does not fail request if logger throws", async () => {
    const app = new Hono()

    app.use(
      "*",
      honostarLogging({
        logger: {
          info: () => {
            throw new Error("logger failed")
          },
          error: () => {
            throw new Error("logger failed")
          },
        },
      })
    )

    app.get("/logger-throws", (c) => c.text("ok"))
    const res = await app.request("http://localhost/logger-throws")

    expect(res.status).toBe(200)
  })

  test("drain receives safe headers only", async () => {
    const drained: any[] = []
    const app = new Hono()

    app.use(
      "*",
      honostarLogging({
        logger: {
          info: () => {},
          error: () => {},
        },
        drain: (ctx) => {
          drained.push(ctx)
        },
      })
    )

    app.get("/drain", (c) => c.text("ok"))

    await app.request("http://localhost/drain", {
      headers: {
        "x-request-id": "req_drain",
        "x-custom-id": "abc123",
        authorization: "Bearer secret",
        cookie: "session=secret",
      },
    })
    await Promise.resolve()

    expect(drained).toHaveLength(1)
    expect(drained[0]?.request?.requestId).toBe("req_drain")
    expect(drained[0]?.headers?.["x-custom-id"]).toBe("abc123")
    expect(drained[0]?.headers?.authorization).toBeUndefined()
    expect(drained[0]?.headers?.cookie).toBeUndefined()
  })

  test("drain header allowlist limits exported headers", async () => {
    const drained: any[] = []
    const app = new Hono()

    app.use(
      "*",
      honostarLogging({
        headerAllowlist: ["x-request-id"],
        logger: {
          info: () => {},
          error: () => {},
        },
        drain: (ctx) => {
          drained.push(ctx)
        },
      })
    )

    app.get("/drain-allowlist", (c) => c.text("ok"))

    await app.request("http://localhost/drain-allowlist", {
      headers: {
        "x-request-id": "req_allow",
        "x-custom-id": "hidden",
      },
    })
    await Promise.resolve()

    expect(drained).toHaveLength(1)
    expect(drained[0]?.headers?.["x-request-id"]).toBe("req_allow")
    expect(drained[0]?.headers?.["x-custom-id"]).toBeUndefined()
  })

  test("does not fail request if drain throws", async () => {
    const app = new Hono()

    app.use(
      "*",
      honostarLogging({
        logger: {
          info: () => {},
          error: () => {},
        },
        drain: () => {
          throw new Error("drain failed")
        },
      })
    )

    app.get("/drain-throws", (c) => c.text("ok"))
    const res = await app.request("http://localhost/drain-throws")
    await Promise.resolve()

    expect(res.status).toBe(200)
  })
})
