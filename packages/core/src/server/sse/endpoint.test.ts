import { beforeEach, describe, expect, test } from "bun:test"
import { Hono } from "hono"
import { createConfig } from "../config"
import type { AppEnv } from "../context"
import { signTopics } from "../security/topics"
import { createSseEndpoint } from "./endpoint"
import { MemoryBus } from "./pubsub/memory"
import type { QueryRegistration } from "./queries"

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

async function readUntil(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  predicate: (text: string) => boolean,
  maxReads = 80
): Promise<string> {
  const decoder = new TextDecoder()
  let text = ""

  for (let i = 0; i < maxReads; i++) {
    const { value, done } = await reader.read()
    if (done) break
    if (value) text += decoder.decode(value)
    if (predicate(text)) break
    await tick()
  }

  return text
}

describe("createSseEndpoint retained topic replay", () => {
  beforeEach(() => {
    delete process.env.HONOSTAR_SIGNING_SECRET
    process.env.NODE_ENV = "development"
  })

  test("replays the retained topic patch immediately on connect", async () => {
    const bus = new MemoryBus()
    bus.toTopic("issues:list", {
      event: "datastar-patch-elements",
      html: '<div id="issues-list">A</div>',
      options: {},
    })

    const app = new Hono<AppEnv>()
    app.use("*", async (c, next) => {
      c.set("clientId", c.req.header("X-Tab-ID") ?? "anonymous")
      c.set("bus", bus)
      await next()
    })
    app.get("/_/events", createSseEndpoint())

    const ac = new AbortController()
    const res = await app.request("/_/events?topics=issues:list", {
      headers: {
        "X-Tab-ID": "client-1",
        "Datastar-Request": "true",
      },
      signal: ac.signal,
    })

    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toContain("text/event-stream")

    const reader = res.body?.getReader()
    expect(reader).toBeTruthy()
    if (!reader) return

    const decoder = new TextDecoder()
    let text = ""

    // Read a few chunks until we see the retained patch.
    for (let i = 0; i < 20; i++) {
      const { value, done } = await reader.read()
      if (done) break
      if (value) text += decoder.decode(value)
      if (text.includes("event: datastar-patch-elements") && text.includes("issues-list")) {
        break
      }
      await tick()
    }

    ac.abort()

    expect(text).toContain("event: datastar-patch-elements")
    expect(text).toContain('data: elements <div id="issues-list">A</div>')
  })
})

describe("createSseEndpoint CQRS topic queries", () => {
  beforeEach(() => {
    delete process.env.HONOSTAR_SIGNING_SECRET
    process.env.NODE_ENV = "development"
  })

  test("runs a registered query on connect and again on honostar-event", async () => {
    const bus = new MemoryBus()
    const topic = "issue:123:comments"

    const queries: QueryRegistration[] = [
      [
        /^issue:(?<id>\d+):comments$/,
        async ({ event }) => {
          return [
            ["patch-elements", `<div id="comments-section">${event ? "EVENT" : "INIT"}</div>`],
          ]
        },
      ],
    ]

    const app = new Hono<AppEnv>()
    app.use("*", async (c, next) => {
      c.set("clientId", c.req.header("X-Tab-ID") ?? "anonymous")
      c.set("bus", bus)
      await next()
    })
    app.get("/_/events", createSseEndpoint(undefined, { queries }))

    const ac = new AbortController()
    const res = await app.request(`/_/events?topics=${topic}`, {
      headers: {
        "X-Tab-ID": "client-1",
        "Datastar-Request": "true",
      },
      signal: ac.signal,
    })

    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toContain("text/event-stream")

    const reader = res.body?.getReader()
    expect(reader).toBeTruthy()
    if (!reader) return

    const decoder = new TextDecoder()
    let text = ""

    // Wait for initial query patch.
    for (let i = 0; i < 50; i++) {
      const { value, done } = await reader.read()
      if (done) break
      if (value) text += decoder.decode(value)
      if (text.includes("comments-section") && text.includes("INIT")) {
        break
      }
      await tick()
    }

    // Trigger a domain event and expect the query to re-run.
    bus.toTopic(topic, { event: "honostar-event", name: "comment:created", payload: "null" })

    for (let i = 0; i < 50; i++) {
      const { value, done } = await reader.read()
      if (done) break
      if (value) text += decoder.decode(value)
      if (text.includes("comments-section") && text.includes("EVENT")) {
        break
      }
      await tick()
    }

    ac.abort()

    expect(text).toContain('data: elements <div id="comments-section">INIT</div>')
    expect(text).toContain('data: elements <div id="comments-section">EVENT</div>')
  })

  test("coalesces shared query execution across connections", async () => {
    const bus = new MemoryBus()
    const topic = "issues:list"
    let invocations = 0

    const queries: QueryRegistration[] = [
      [
        topic,
        async ({ event }) => {
          invocations += 1
          await new Promise((resolve) => setTimeout(resolve, 20))
          return [
            ["patch-elements", `<div id="issues-list">${event ? "EVENT" : "INIT"}</div>`],
          ]
        },
        { shared: true, cacheMs: 500 },
      ],
    ]

    const app = new Hono<AppEnv>()
    app.use("*", async (c, next) => {
      c.set("clientId", c.req.header("X-Tab-ID") ?? "anonymous")
      c.set("bus", bus)
      await next()
    })
    app.get("/_/events", createSseEndpoint(undefined, { queries }))

    const ac1 = new AbortController()
    const ac2 = new AbortController()
    const [res1, res2] = await Promise.all([
      app.request(`/_/events?topics=${topic}`, {
        headers: { "X-Tab-ID": "client-1", "Datastar-Request": "true" },
        signal: ac1.signal,
      }),
      app.request(`/_/events?topics=${topic}`, {
        headers: { "X-Tab-ID": "client-2", "Datastar-Request": "true" },
        signal: ac2.signal,
      }),
    ])

    const reader1 = res1.body?.getReader()
    const reader2 = res2.body?.getReader()
    expect(reader1).toBeTruthy()
    expect(reader2).toBeTruthy()
    if (!reader1 || !reader2) return

    const [init1, init2] = await Promise.all([
      readUntil(reader1, (text) => text.includes("issues-list") && text.includes("INIT")),
      readUntil(reader2, (text) => text.includes("issues-list") && text.includes("INIT")),
    ])

    expect(init1).toContain("INIT")
    expect(init2).toContain("INIT")
    expect(invocations).toBe(1)

    bus.toTopic(topic, { event: "honostar-event", name: "issue:updated", payload: "null" })

    const [event1, event2] = await Promise.all([
      readUntil(reader1, (text) => text.includes("issues-list") && text.includes("EVENT")),
      readUntil(reader2, (text) => text.includes("issues-list") && text.includes("EVENT")),
    ])

    ac1.abort()
    ac2.abort()

    expect(event1).toContain("EVENT")
    expect(event2).toContain("EVENT")
    expect(invocations).toBe(2)
  })

  test("runs non-shared query per connection", async () => {
    const bus = new MemoryBus()
    const topic = "issues:list"
    let invocations = 0

    const queries: QueryRegistration[] = [
      [
        topic,
        async ({ event }) => {
          invocations += 1
          return [
            ["patch-elements", `<div id="issues-list">${event ? "EVENT" : "INIT"}</div>`],
          ]
        },
      ],
    ]

    const app = new Hono<AppEnv>()
    app.use("*", async (c, next) => {
      c.set("clientId", c.req.header("X-Tab-ID") ?? "anonymous")
      c.set("bus", bus)
      await next()
    })
    app.get("/_/events", createSseEndpoint(undefined, { queries }))

    const ac1 = new AbortController()
    const ac2 = new AbortController()
    const [res1, res2] = await Promise.all([
      app.request(`/_/events?topics=${topic}`, {
        headers: { "X-Tab-ID": "client-1", "Datastar-Request": "true" },
        signal: ac1.signal,
      }),
      app.request(`/_/events?topics=${topic}`, {
        headers: { "X-Tab-ID": "client-2", "Datastar-Request": "true" },
        signal: ac2.signal,
      }),
    ])

    const reader1 = res1.body?.getReader()
    const reader2 = res2.body?.getReader()
    expect(reader1).toBeTruthy()
    expect(reader2).toBeTruthy()
    if (!reader1 || !reader2) return

    await Promise.all([
      readUntil(reader1, (text) => text.includes("issues-list") && text.includes("INIT")),
      readUntil(reader2, (text) => text.includes("issues-list") && text.includes("INIT")),
    ])
    expect(invocations).toBe(2)

    bus.toTopic(topic, { event: "honostar-event", name: "issue:updated", payload: "null" })

    await Promise.all([
      readUntil(reader1, (text) => text.includes("issues-list") && text.includes("EVENT")),
      readUntil(reader2, (text) => text.includes("issues-list") && text.includes("EVENT")),
    ])

    ac1.abort()
    ac2.abort()

    expect(invocations).toBe(4)
  })

  test("shared key includes non-reserved SSE query params", async () => {
    const bus = new MemoryBus()
    const topic = "issues:list"
    let invocations = 0

    const queries: QueryRegistration[] = [
      [
        topic,
        async () => {
          invocations += 1
          await new Promise((resolve) => setTimeout(resolve, 20))
          return [["patch-elements", '<div id="issues-list">INIT</div>']]
        },
        { shared: true, cacheMs: 500 },
      ],
    ]

    const app = new Hono<AppEnv>()
    app.use("*", async (c, next) => {
      c.set("clientId", c.req.header("X-Tab-ID") ?? "anonymous")
      c.set("bus", bus)
      await next()
    })
    app.get("/_/events", createSseEndpoint(undefined, { queries }))

    const ac1 = new AbortController()
    const ac2 = new AbortController()
    const [res1, res2] = await Promise.all([
      app.request(`/_/events?topics=${topic}&filter=a`, {
        headers: { "X-Tab-ID": "client-1", "Datastar-Request": "true" },
        signal: ac1.signal,
      }),
      app.request(`/_/events?topics=${topic}&filter=b`, {
        headers: { "X-Tab-ID": "client-2", "Datastar-Request": "true" },
        signal: ac2.signal,
      }),
    ])

    const reader1 = res1.body?.getReader()
    const reader2 = res2.body?.getReader()
    expect(reader1).toBeTruthy()
    expect(reader2).toBeTruthy()
    if (!reader1 || !reader2) return

    await Promise.all([
      readUntil(reader1, (text) => text.includes("issues-list") && text.includes("INIT")),
      readUntil(reader2, (text) => text.includes("issues-list") && text.includes("INIT")),
    ])

    ac1.abort()
    ac2.abort()

    expect(invocations).toBe(2)
  })
})

describe("createSseEndpoint topic allowlist verification", () => {
  beforeEach(() => {
    process.env.HONOSTAR_SIGNING_SECRET = "test-secret-key-for-testing-only-minimum-32-chars"
    process.env.NODE_ENV = "test"
  })

  test("subscribes when topicsToken query param is present (no cookie)", async () => {
    const bus = new MemoryBus()
    bus.toTopic("issues:list", {
      event: "datastar-patch-elements",
      html: '<div id="issues-list">A</div>',
      options: {},
    })

    const cfg = createConfig()
    const app = new Hono<AppEnv>()
    app.use("*", async (c, next) => {
      c.set("clientId", c.req.header("X-Tab-ID") ?? "anonymous")
      c.set("bus", bus)
      await next()
    })

    app.get("/token", async (c) => {
      const token = await signTopics(c, ["issues:list"], cfg)
      return c.text(token ?? "")
    })

    app.get("/_/events", createSseEndpoint(cfg))

    const tokenRes = await app.request("/token", {
      headers: { "X-Tab-ID": "client-1" },
    })
    const token = await tokenRes.text()
    expect(token).toBeTruthy()

    const ac = new AbortController()
    const res = await app.request(
      `/_/events?topics=issues:list&topicsToken=${encodeURIComponent(token)}`,
      {
        headers: {
          "X-Tab-ID": "client-1",
          "Datastar-Request": "true",
        },
        signal: ac.signal,
      }
    )

    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toContain("text/event-stream")

    const reader = res.body?.getReader()
    expect(reader).toBeTruthy()
    if (!reader) return

    const decoder = new TextDecoder()
    let text = ""

    for (let i = 0; i < 20; i++) {
      const { value, done } = await reader.read()
      if (done) break
      if (value) text += decoder.decode(value)
      if (text.includes("issues-list")) break
      await tick()
    }

    ac.abort()

    expect(text).toContain("event: datastar-patch-elements")
    expect(text).toContain('data: elements <div id="issues-list">A</div>')
  })

  test("does not subscribe when token is missing", async () => {
    const bus = new MemoryBus()
    bus.toTopic("issues:list", {
      event: "datastar-patch-elements",
      html: '<div id="issues-list">A</div>',
      options: {},
    })

    const cfg = createConfig({ sse: { pingIntervalMs: 5 } })
    const app = new Hono<AppEnv>()
    app.use("*", async (c, next) => {
      c.set("clientId", c.req.header("X-Tab-ID") ?? "anonymous")
      c.set("bus", bus)
      await next()
    })

    app.get("/_/events", createSseEndpoint(cfg))

    const ac = new AbortController()
    const res = await app.request("/_/events?topics=issues:list", {
      headers: {
        "X-Tab-ID": "client-1",
        "Datastar-Request": "true",
      },
      signal: ac.signal,
    })

    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toContain("text/event-stream")

    const reader = res.body?.getReader()
    expect(reader).toBeTruthy()
    if (!reader) return

    const decoder = new TextDecoder()
    let text = ""

    // Read a few chunks and ensure we never see the retained patch.
    for (let i = 0; i < 20; i++) {
      const { value, done } = await reader.read()
      if (done) break
      if (value) text += decoder.decode(value)
      await tick()
    }

    ac.abort()

    expect(text).not.toContain("issues-list")
    expect(text).not.toContain("event: datastar-patch-elements")
  })
})

describe("createSseEndpoint probe requests", () => {
  test("returns 204 for probe checks", async () => {
    const app = new Hono<AppEnv>()
    app.get("/_/events", createSseEndpoint())

    const res = await app.request("/_/events?__honostar_probe=1", {
      headers: { "X-Honostar-Probe": "1" },
    })

    expect(res.status).toBe(204)
    expect(res.headers.get("x-honostar-sse")).toBe("ok")
  })
})
