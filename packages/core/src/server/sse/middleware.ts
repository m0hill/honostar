import type { StatusCode } from "hono/utils/http-status"
import { factory } from "../middleware"
import type { EffectDefinition, EffectHandler } from "./effect-registry"
import type { QueryHandler, QueryOptions, QueryRegistration } from "./queries"
import { TopicQueryRegistry } from "./queries"

/**
 * A structured response for handlers that want to emit effects without manually calling `c.var.fx.reply()`.
 *
 * This is mainly useful when you want to return a value from your handler and let middleware translate it
 * into the correct transport (HTTP patch vs SSE).
 */
export type FxResponse = {
  /**
   * Effect list to execute.
   */
  fx: EffectDefinition[]
  /**
   * Close the SSE stream after processing (rare; mostly for internal use).
   */
  close?: boolean
  /**
   * HTTP status code to use when returning an HTTP response.
   */
  status?: StatusCode
  /**
   * Topic(s) to broadcast to (topic-scoped).
   */
  topics?: string[]
  /**
   * When true, send effects only to the initiating tab (client-scoped).
   */
  toClient?: boolean
  /**
   * Optional headers (mainly relevant for HTTP patch replies).
   */
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
 * @param name - Effect name (e.g. `"toast:show"`).
 * @param handler - Effect handler invoked with `c` and the effect arguments.
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
 * @param effects - Map of effect name to handler.
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
 *
 * @param topicOrPattern - Concrete topic name or RegExp with named groups.
 * @param handler - Query handler returning effects to emit over SSE.
 *
 * @example
 * ```ts
 * app.use("*", registerQuery("issues:list", async ({ c }) => {
 *   const issues = await loadIssues(c)
 *   return [["patch-elements", <IssuesList issues={issues} />]]
 * }))
 * ```
 */
export function registerQuery(
  topicOrPattern: string | RegExp,
  handler: QueryHandler,
  options?: QueryOptions
) {
  return factory.createMiddleware(async (c, next) => {
    const queries = c.var.queries ?? new TopicQueryRegistry()
    if (!c.var.queries) c.set("queries", queries)

    // Narrow for overload resolution (string vs RegExp).
    if (typeof topicOrPattern === "string") queries.register(topicOrPattern, handler, options)
    else queries.register(topicOrPattern, handler, options)
    await next()
  })
}

/**
 * Register multiple topic query handlers at once.
 *
 * @param queries - List of query registrations.
 */
export function registerQueries(queries: QueryRegistration[]) {
  return factory.createMiddleware(async (c, next) => {
    const registry = c.var.queries ?? new TopicQueryRegistry()
    if (!c.var.queries) c.set("queries", registry)

    for (const [topicOrPattern, handler, options] of queries) {
      // Narrow for overload resolution (string vs RegExp).
      if (typeof topicOrPattern === "string") registry.register(topicOrPattern, handler, options)
      else registry.register(topicOrPattern, handler, options)
    }
    await next()
  })
}
