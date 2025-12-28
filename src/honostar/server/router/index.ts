import type { Context, Hono, MiddlewareHandler } from 'hono'
import type { AppEnv } from '@/honostar/server/context'
import {
  type HandlerDefinition,
  type PageDefinition,
  resolvePageHead,
  resolvePageLayouts,
} from '@/honostar/server/page'
import type { RouteLoader } from '@/honostar/server/router/types'
import type { FxResponse } from '@/honostar/server/sse/middleware'
import type { QueryHandler, QueryRegistration } from '@/honostar/server/sse/queries'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS'
type HandlerLike =
  | HandlerDefinition
  | ((c: Context<AppEnv>) => Promise<Response | void> | Response | void)

function isFxResponse(value: unknown): value is FxResponse {
  if (typeof value !== 'object' || value === null || value instanceof Response) {
    return false
  }
  return 'fx' in value && Array.isArray((value as { fx?: unknown }).fx)
}

function isPageDefinition(value: unknown): value is PageDefinition {
  return (
    typeof value === 'object' &&
    value !== null &&
    'component' in value &&
    typeof (value as Record<string, unknown>).component === 'function'
  )
}

function isHandlerDefinition(value: unknown): value is HandlerDefinition {
  return (
    typeof value === 'object' &&
    value !== null &&
    'handler' in value &&
    typeof (value as Record<string, unknown>).handler === 'function'
  )
}

function isHandlerLike(value: unknown): value is HandlerLike {
  return typeof value === 'function' || isHandlerDefinition(value)
}

function wrapHandler(handler: HandlerLike): MiddlewareHandler<AppEnv> {
  return async (c: Context<AppEnv>) => {
    const finalHandler = isHandlerDefinition(handler) ? handler.handler : handler
    const result = await finalHandler(c)

    if (isFxResponse(result)) {
      c.set('fxResponse', result)
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
  if (typeof topicOrPattern === 'string') return `s:${topicOrPattern}`
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

async function registerModule(
  app: Hono<AppEnv>,
  routePath: string,
  mod: Record<string, unknown>,
  options: MountRoutesOptions | undefined,
  queryDedupe: Map<string, QueryHandler>
) {
  const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']

  for (const method of methods) {
    const handlerExport = mod[method]
    if (!handlerExport) continue

    const asArray = Array.isArray(handlerExport) ? handlerExport : [handlerExport]
    const handlers = asArray.filter(isHandlerLike)
    if (handlers.length === 0) continue

    const middlewares = handlers.filter(isHandlerDefinition).flatMap(h => (h.use ? h.use : []))

    if (Array.isArray(handlerExport)) {
      app.on(method, routePath, ...middlewares, ...handlers.map(wrapHandler))
    } else {
      app.on(method, routePath, ...middlewares, wrapHandler(handlers[0]!))
    }
  }

  if (mod.default && isPageDefinition(mod.default)) {
    const pageDef = mod.default

    collectQueries(options?.collect?.queries, pageDef.queries, queryDedupe)

    const pageHandler = async (c: Context<AppEnv>) => {
      if (pageDef.topics) {
        const topics =
          typeof pageDef.topics === 'function' ? await pageDef.topics(c) : pageDef.topics
        c.set('sseTopics', topics)
      }
      if (pageDef.sseParams) {
        const sseParams =
          typeof pageDef.sseParams === 'function' ? await pageDef.sseParams(c) : pageDef.sseParams
        c.set('sseParams', sseParams)
      }

      const loaderResult = (await pageDef.loader?.(c)) ?? {}
      if (loaderResult instanceof Response) {
        return loaderResult
      }

      if (pageDef.head) {
        c.set('pageHead', await resolvePageHead(pageDef.head, loaderResult, c))
      }

      let pageComponent = pageDef.component(loaderResult)
      const layouts = resolvePageLayouts(pageDef.layout)
      for (const layout of [...layouts].toReversed()) {
        pageComponent = layout(c, loaderResult, pageComponent)
      }

      return c.render(pageComponent)
    }

    const handlers = [...(pageDef.use || []), pageHandler]
    app.get(routePath, ...handlers)
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
