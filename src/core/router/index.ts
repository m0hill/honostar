import type { Context, Hono, MiddlewareHandler } from 'hono'
import type { AppEnv } from '@/core/context'
import type { FxResponse } from '@/core/datastar/middleware'
import type { HandlerDefinition, PageDefinition } from '@/core/page'
import type { RouteLoader } from '@/core/router/types'

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

async function registerModule(app: Hono<AppEnv>, routePath: string, mod: Record<string, unknown>) {
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

    const pageHandler = async (c: Context<AppEnv>) => {
      if (pageDef.topics) {
        const topics =
          typeof pageDef.topics === 'function' ? await pageDef.topics(c) : pageDef.topics
        c.set('sseTopics', topics)
      }

      const loaderResult = (await pageDef.loader?.(c)) ?? {}
      if (loaderResult instanceof Response) {
        return loaderResult
      }

      const pageComponent = pageDef.component(loaderResult)
      return c.render(pageComponent)
    }

    const handlers = [...(pageDef.use || []), pageHandler]
    app.get(routePath, ...handlers)
  }
}

export async function mountRoutes(app: Hono<AppEnv>, loader: RouteLoader) {
  for await (const { routePath, module } of loader.load()) {
    await registerModule(app, routePath, module)
  }
}
