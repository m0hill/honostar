import type { Context, Hono, MiddlewareHandler } from "hono"
import type { AppEnv } from "../context"
import {
  type HandlerDefinition,
  type PageDefinition,
  resolvePageHead,
  resolvePageLayouts,
} from "../page"
import type { FxResponse } from "../sse/middleware"
import type { QueryHandler, QueryRegistration } from "../sse/queries"
import type { RouteLoader } from "./types"

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS"
type HandlerLike =
  | HandlerDefinition
  | ((c: Context<AppEnv>) => Promise<Response | void> | Response | void)

function isFxResponse(value: unknown): value is FxResponse {
  if (typeof value !== "object" || value === null || value instanceof Response) {
    return false
  }
  return "fx" in value && Array.isArray((value as { fx?: unknown }).fx)
}

function isPageDefinition(value: unknown): value is PageDefinition {
  return (
    typeof value === "object" &&
    value !== null &&
    "component" in value &&
    typeof (value as Record<string, unknown>).component === "function"
  )
}

function isHandlerDefinition(value: unknown): value is HandlerDefinition {
  return (
    typeof value === "object" &&
    value !== null &&
    "handler" in value &&
    typeof (value as Record<string, unknown>).handler === "function"
  )
}

function isHandlerLike(value: unknown): value is HandlerLike {
  return typeof value === "function" || isHandlerDefinition(value)
}

function wrapHandler(handler: HandlerLike): MiddlewareHandler<AppEnv> {
  return async (c: Context<AppEnv>) => {
    const finalHandler = isHandlerDefinition(handler) ? handler.handler : handler
    const result = await finalHandler(c)

    if (isFxResponse(result)) {
      c.set("fxResponse", result)
      return c.res
    }

    return result
  }
}

type MountRoutesOptions = {
  collect?: {
    queries?: QueryRegistration[]
  }
}

function queryKey(topicOrPattern: string | RegExp): string {
  if (typeof topicOrPattern === "string") return `s:${topicOrPattern}`
  return `r:${topicOrPattern.source}/${topicOrPattern.flags}`
}

function collectQueries(
  target: QueryRegistration[] | undefined,
  registrations: QueryRegistration[] | undefined,
  dedupe: Map<string, QueryHandler>
): void {
  if (!target || !registrations || registrations.length === 0) return

  for (const registration of registrations) {
    const [topicOrPattern, handler] = registration
    const key = queryKey(topicOrPattern)

    const existing = dedupe.get(key)
    if (existing) {
      if (existing !== handler) {
        console.warn(
          `[CQRS] Duplicate query registration for "${key}" detected; keeping the first handler.`
        )
      }
      continue
    }

    dedupe.set(key, handler)
    target.push(registration)
  }
}

function inferTopicsFromQueries(registrations: QueryRegistration[] | undefined): {
  topics: string[]
  hasPattern: boolean
} {
  if (!registrations || registrations.length === 0) return { topics: [], hasPattern: false }

  const topics: string[] = []
  let hasPattern = false

  for (const [topicOrPattern] of registrations) {
    if (typeof topicOrPattern === "string") {
      topics.push(topicOrPattern)
    } else {
      hasPattern = true
    }
  }

  return { topics: [...new Set(topics)], hasPattern }
}

async function registerModule(
  app: Hono<AppEnv>,
  routePath: string,
  mod: Record<string, unknown>,
  options: MountRoutesOptions | undefined,
  queryDedupe: Map<string, QueryHandler>
) {
  const methods: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]

  for (const method of methods) {
    const handlerExport = mod[method]
    if (!handlerExport) continue

    const asArray = Array.isArray(handlerExport) ? handlerExport : [handlerExport]
    const handlers = asArray.filter(isHandlerLike)
    if (handlers.length === 0) continue

    const middlewares = handlers.filter(isHandlerDefinition).flatMap((h) => (h.use ? h.use : []))

    if (Array.isArray(handlerExport)) {
      // Hono's handler typings are heavily tuple-overloaded; spreading arrays often makes TS
      // select the "paths: string[]" overload by accident. We know at runtime this is valid.
      const honoHandlers = [...middlewares, ...handlers.map(wrapHandler)]
      if (honoHandlers.length === 0) continue
      ;(app.on as unknown as (...args: unknown[]) => unknown)(
        method,
        routePath,
        ...(honoHandlers as unknown as [unknown, ...unknown[]])
      )
    } else {
      const honoHandlers = [...middlewares, wrapHandler(handlers[0]!)]
      ;(app.on as unknown as (...args: unknown[]) => unknown)(
        method,
        routePath,
        ...(honoHandlers as unknown as [unknown, ...unknown[]])
      )
    }
  }

  if (mod.default && isPageDefinition(mod.default)) {
    const pageDef = mod.default

    collectQueries(options?.collect?.queries, pageDef.queries, queryDedupe)

    const pageHandler = async (c: Context<AppEnv>) => {
      if (pageDef.topics) {
        const topics =
          typeof pageDef.topics === "function" ? await pageDef.topics(c) : pageDef.topics
        c.set("sseTopics", topics)
      } else if (pageDef.queries && pageDef.queries.length > 0) {
        const inferred = inferTopicsFromQueries(pageDef.queries)
        if (inferred.topics.length > 0) {
          c.set("sseTopics", inferred.topics)
        } else if (inferred.hasPattern) {
          console.warn(
            `[CQRS] Page "${routePath}" declares pattern-based queries but no explicit topics; ` +
              "SSE will not subscribe to any topics. Add `topics: [...]` to the page definition."
          )
        }
      }
      if (pageDef.sseParams) {
        const sseParams =
          typeof pageDef.sseParams === "function" ? await pageDef.sseParams(c) : pageDef.sseParams
        c.set("sseParams", sseParams)
      }

      const loaderResult = (await pageDef.loader?.(c)) ?? {}
      if (loaderResult instanceof Response) {
        return loaderResult
      }

      if (pageDef.head) {
        c.set("pageHead", await resolvePageHead(pageDef.head, loaderResult, c))
      }

      let pageComponent = pageDef.component(loaderResult)
      const layouts = resolvePageLayouts(pageDef.layout)
      for (const layout of [...layouts].toReversed()) {
        pageComponent = layout(c, loaderResult, pageComponent)
      }

      return c.render(pageComponent)
    }

    // Same typing caveat as above: ensure TS doesn't pick the wrong overload.
    const pageHandlers = [...(pageDef.use || []), pageHandler]
    ;(app.get as unknown as (...args: unknown[]) => unknown)(
      routePath,
      ...(pageHandlers as unknown as [unknown, ...unknown[]])
    )
  }
}

export async function mountRoutes(
  app: Hono<AppEnv>,
  loader: RouteLoader,
  options?: MountRoutesOptions
) {
  const queryDedupe = new Map<string, QueryHandler>()
  for await (const { routePath, module } of loader.load()) {
    await registerModule(app, routePath, module, options, queryDedupe)
  }
}
