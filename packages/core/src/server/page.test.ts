import { describe, expect, test } from "bun:test"
import type { StandardSchemaV1 } from "@standard-schema/spec"
import type { Context } from "hono"
import { Hono } from "hono"
import type { AppEnv } from "./context"
import { createHandler } from "./page"

function createTestSchema<Output>(
  validate: (
    value: unknown
  ) => StandardSchemaV1.Result<Output> | Promise<StandardSchemaV1.Result<Output>>
): StandardSchemaV1<unknown, Output> {
  return {
    "~standard": {
      version: 1,
      vendor: "honostar-test",
      validate,
      // Needed so StandardSchemaV1.InferOutput<Schema> works in TypeScript.
      types: {
        input: undefined as unknown,
        output: undefined as Output,
      },
    },
  }
}

describe("createHandler request parsing", () => {
  test("parses GET query string params", async () => {
    const route = createHandler({
      schema: createTestSchema<{ search: string; status: "open" | "closed" | "all" }>((raw) => {
        const data = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>
        const search = typeof data.search === "string" ? data.search : ""
        const status =
          data.status === "open" || data.status === "closed" || data.status === "all"
            ? data.status
            : "open"
        return { value: { search, status } }
      }),
      hook: () => new Response("invalid", { status: 400 }),
      async handler(c, data) {
        return c.json({ search: data.search, status: data.status })
      },
    })

    const app = new Hono<AppEnv>()
    app.get(
      "/",
      (route as unknown as { handler: (c: Context<AppEnv>) => Promise<Response> }).handler
    )

    const res = await app.request("/?search=bug&status=closed")
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ search: "bug", status: "closed" })
  })

  test("merges GET query string with datastar payload (datastar wins)", async () => {
    const route = createHandler({
      schema: createTestSchema<{ search: string; status: "open" | "closed" | "all" }>((raw) => {
        const data = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>
        const search = typeof data.search === "string" ? data.search : ""
        const status =
          data.status === "open" || data.status === "closed" || data.status === "all"
            ? data.status
            : "open"
        return { value: { search, status } }
      }),
      hook: () => new Response("invalid", { status: 400 }),
      async handler(c, data) {
        return c.json({ search: data.search, status: data.status })
      },
    })

    const app = new Hono<AppEnv>()
    app.get(
      "/",
      (route as unknown as { handler: (c: Context<AppEnv>) => Promise<Response> }).handler
    )

    const datastar = encodeURIComponent(JSON.stringify({ search: "hello", status: "open" }))
    const res = await app.request(`/?search=bug&status=closed&datastar=${datastar}`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ search: "hello", status: "open" })
  })

  test("parses application/x-www-form-urlencoded bodies", async () => {
    const route = createHandler({
      schema: createTestSchema<{ name: string }>((raw) => {
        const data = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>
        if (typeof data.name !== "string" || data.name.length === 0) {
          return { issues: [{ message: "name is required", path: ["name"] }] }
        }
        return { value: { name: data.name } }
      }),
      hook: () => new Response("invalid", { status: 400 }),
      async handler(c, data) {
        return c.json({ name: data.name })
      },
    })

    const app = new Hono<AppEnv>()
    app.post(
      "/",
      (route as unknown as { handler: (c: Context<AppEnv>) => Promise<Response> }).handler
    )

    const res = await app.request("/", {
      method: "POST",
      body: new URLSearchParams({ name: "alice" }),
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ name: "alice" })
  })

  test("expands dotted/bracket keys in urlencoded bodies", async () => {
    const route = createHandler({
      schema: createTestSchema<{ user: { name: string }; tags: string[] }>((raw) => {
        const data = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>
        const user = data.user
        if (typeof user !== "object" || user === null) {
          return { issues: [{ message: "user is required", path: ["user"] }] }
        }
        const userRecord = user as Record<string, unknown>
        if (typeof userRecord.name !== "string" || userRecord.name.length === 0) {
          return { issues: [{ message: "user.name is required", path: ["user", "name"] }] }
        }

        const tagsRaw = data.tags
        const tags =
          typeof tagsRaw === "string" ? [tagsRaw] : Array.isArray(tagsRaw) ? tagsRaw : []
        if (tags.some((t) => typeof t !== "string")) {
          return { issues: [{ message: "tags must be strings", path: ["tags"] }] }
        }

        return { value: { user: { name: userRecord.name }, tags: tags as string[] } }
      }),
      hook: () => new Response("invalid", { status: 400 }),
      async handler(c, data) {
        return c.json(data)
      },
    })

    const app = new Hono<AppEnv>()
    app.post(
      "/",
      (route as unknown as { handler: (c: Context<AppEnv>) => Promise<Response> }).handler
    )

    const body = new URLSearchParams()
    body.append("user[name]", "alice")
    body.append("tags[]", "a")
    body.append("tags[]", "b")

    const res = await app.request("/", { method: "POST", body })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ user: { name: "alice" }, tags: ["a", "b"] })
  })

  test("parses repeated query params into arrays", async () => {
    const route = createHandler({
      schema: createTestSchema<{ tag: string[] }>((raw) => {
        const data = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>
        const tagRaw = data.tag
        const tag = typeof tagRaw === "string" ? [tagRaw] : Array.isArray(tagRaw) ? tagRaw : []
        if (tag.some((t) => typeof t !== "string")) {
          return { issues: [{ message: "tag must be strings", path: ["tag"] }] }
        }
        return { value: { tag: tag as string[] } }
      }),
      hook: () => new Response("invalid", { status: 400 }),
      async handler(c, data) {
        return c.json(data)
      },
    })

    const app = new Hono<AppEnv>()
    app.get(
      "/",
      (route as unknown as { handler: (c: Context<AppEnv>) => Promise<Response> }).handler
    )

    const res = await app.request("/?tag=a&tag=b")
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ tag: ["a", "b"] })
  })

  test("parses multipart/form-data bodies (including File)", async () => {
    const route = createHandler({
      schema: createTestSchema<{ note: string; upload: File }>((raw) => {
        const data = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>
        const note = typeof data.note === "string" ? data.note : ""
        const upload = data.upload
        if (!note) return { issues: [{ message: "note is required", path: ["note"] }] }
        if (!(upload instanceof File)) {
          return { issues: [{ message: "upload must be a File", path: ["upload"] }] }
        }
        return { value: { note, upload } }
      }),
      hook: () => new Response("invalid", { status: 400 }),
      async handler(c, data) {
        return c.json({
          note: data.note,
          filename: data.upload.name,
          isFile: data.upload instanceof File,
        })
      },
    })

    const app = new Hono<AppEnv>()
    app.post(
      "/",
      (route as unknown as { handler: (c: Context<AppEnv>) => Promise<Response> }).handler
    )

    const form = new FormData()
    form.set("note", "hello")
    form.set("upload", new File(["hi"], "hi.txt", { type: "text/plain" }))

    const res = await app.request("/", {
      method: "POST",
      body: form,
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ note: "hello", filename: "hi.txt", isFile: true })
  })
})
