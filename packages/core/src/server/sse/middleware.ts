import type { StatusCode } from "hono/utils/http-status"
import { factory } from "../middleware"
import type { EffectDefinition, EffectHandler } from "./effect-registry"
import type { QueryHandler } from "./queries"
import { TopicQueryRegistry } from "./queries"

export type FxResponse = {
  fx: EffectDefinition[]
  close?: boolean
  status?: StatusCode
  topics?: string[]
  toClient?: boolean
  headers?: Record<string, string>
}

function isFxResponse(value: unknown): value is FxResponse {
  if (typeof value !== "object" || value === null || value instanceof Response) {
    return false
  }

  return "fx" in value && Array.isArray((value as { fx: unknown }).fx)
}

export const fxResponder = factory.createMiddleware(async (c, next) => {
  await next()

  const fxResponse = c.var.fxResponse
  if (isFxResponse(fxResponse)) {
    c.res = await c.var.fx.respond({
      effects: fxResponse.fx,
      ...(fxResponse.close !== undefined && { close: fxResponse.close }),
      ...(fxResponse.status !== undefined && { status: fxResponse.status }),
      ...(fxResponse.topics !== undefined && { topics: fxResponse.topics }),
      ...(fxResponse.toClient !== undefined && { toClient: fxResponse.toClient }),
      ...(fxResponse.headers !== undefined && { headers: fxResponse.headers }),
    })
  }
})

/**
 * Register a custom effect handler.
 * This middleware allows you to extend Honostar with your own effects.
 *
 * @example
 * ```typescript
 * app.use('*', registerEffect('toast:show', async (c, message: string, type: 'success' | 'error') => {
 *   // Call other effects to compose behavior
 *   await c.var.fx.reply([
 *     ['patch-elements', <Toast message={message} type={type} />, { selector: '#toast-container', mode: 'append' }]
 *   ])
 * }))
 *
 * // Now use it in handlers:
 * export const POST = createHandler({
 *   async handler(c) {
 *     return c.var.fx.reply([
 *       ['toast:show', 'Success!', 'success']
 *     ])
 *   }
 * })
 * ```
 */
export function registerEffect<TArgs extends unknown[] = unknown[]>(
  name: string,
  handler: EffectHandler<TArgs>
) {
  return factory.createMiddleware(async (c, next) => {
    c.var.fx.effectRegistry.register(name, handler)
    await next()
  })
}

/**
 * Register multiple effects at once.
 *
 * @example
 * ```typescript
 * app.use('*', registerEffects({
 *   'toast:show': async (c, message: string, type: 'success' | 'error') => {
 *     // Implementation
 *   },
 *   'modal:close': async (c, modalId: string) => {
 *     // Implementation
 *   },
 *   'analytics:track': async (c, event: string, properties: Record<string, unknown>) => {
 *     // Implementation
 *   }
 * }))
 * ```
 */
export function registerEffects(effects: Record<string, EffectHandler>) {
  return factory.createMiddleware(async (c, next) => {
    for (const [name, handler] of Object.entries(effects)) {
      c.var.fx.effectRegistry.register(name, handler)
    }
    await next()
  })
}

/**
 * Register a topic query handler (CQRS).
 *
 * Query handlers run on the SSE connection when a topic receives a domain event,
 * and should return fat patches (built-in effects like patch-elements / patch-signals).
 */
export function registerQuery(topicOrPattern: string | RegExp, handler: QueryHandler) {
  return factory.createMiddleware(async (c, next) => {
    const queries = c.var.queries ?? new TopicQueryRegistry()
    if (!c.var.queries) c.set("queries", queries)

    if (typeof topicOrPattern === "string") queries.register(topicOrPattern, handler)
    else queries.register(topicOrPattern, handler)
    await next()
  })
}

/**
 * Register multiple topic query handlers at once.
 */
export function registerQueries(
  queries: Array<[topicOrPattern: string | RegExp, handler: QueryHandler]>
) {
  return factory.createMiddleware(async (c, next) => {
    const registry = c.var.queries ?? new TopicQueryRegistry()
    if (!c.var.queries) c.set("queries", registry)

    for (const [topicOrPattern, handler] of queries) {
      if (typeof topicOrPattern === "string") registry.register(topicOrPattern, handler)
      else registry.register(topicOrPattern, handler)
    }
    await next()
  })
}
