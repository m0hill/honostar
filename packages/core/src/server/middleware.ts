import { createFactory } from "hono/factory"
import type { AppEnv } from "./context"
import { isDatastarRequest } from "./request"
import { createRegionRegistry } from "./regions"
import { TopicQueryRegistry } from "./sse/queries"

export const factory = createFactory<AppEnv>()

export const initContext = factory.createMiddleware(async (c, next) => {
  c.set("clientId", c.req.header("X-Tab-ID") ?? "anonymous")
  c.set("isDatastarRequest", isDatastarRequest(c))
  c.set("regionRegistry", createRegionRegistry())
  c.set("queries", new TopicQueryRegistry())
  await next()
})
