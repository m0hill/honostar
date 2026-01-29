import { beforeEach, describe, expect, test } from "bun:test"
import { Hono } from "hono"
import type { AppEnv } from "./context"
import { renderer } from "./renderer"

function base64urlDecode(str: string): Uint8Array {
  const padded = str + "==".slice(0, (4 - (str.length % 4)) % 4)
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/")
  const binary = atob(base64)
  return new Uint8Array(Array.from(binary, (c) => c.charCodeAt(0)))
}

function decodeTopicsFromToken(token: string): string[] {
  const [payloadB64] = token.split(".")
  if (!payloadB64) return []
  const payloadBytes = base64urlDecode(payloadB64)
  const payloadJson = new TextDecoder().decode(payloadBytes)
  const payload = JSON.parse(payloadJson) as { topics?: unknown }
  return Array.isArray(payload.topics)
    ? payload.topics.filter((t): t is string => typeof t === "string")
    : []
}

describe("renderer topic allowlist signing", () => {
  beforeEach(() => {
    process.env.HONOSTAR_SIGNING_SECRET = "test-secret-key-for-testing-only-minimum-32-chars"
    process.env.NODE_ENV = "test"
  })

  test("signs the actual per-page topics (not an empty allowlist)", async () => {
    const app = new Hono<AppEnv>()
    app.use("*", renderer())

    app.get("/", async (c) => {
      c.set("sseTopics", ["labels:list"])
      const htmlDoc = await c.var.renderToString(<div>ok</div>)
      return c.html(htmlDoc)
    })

    const res = await app.request("http://localhost/")
    const html = await res.text()

    const match = html.match(/topicsToken=([^'&]+)/)
    expect(match?.[1]).toBeTruthy()
    if (!match?.[1]) return

    const token = decodeURIComponent(match[1])
    const topics = decodeTopicsFromToken(token)
    expect(topics).toContain("labels:list")
  })
})
