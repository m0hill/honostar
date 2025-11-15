import type { StatusCode } from 'hono/utils/http-status'
import { factory } from '@/honostar/server/middleware'
import type { EffectDefinition, EffectHandler } from '@/honostar/server/sse/effect-registry'

export type FxResponse = {
  fx: EffectDefinition[]
  close?: boolean
  status?: StatusCode
  topics?: string[]
  toClient?: boolean
  headers?: Record<string, string>
}

function isFxResponse(value: unknown): value is FxResponse {
  if (typeof value !== 'object' || value === null || value instanceof Response) {
    return false
  }

  return 'fx' in value && Array.isArray((value as { fx: unknown }).fx)
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
export function registerEffects(effects: { [K: string]: EffectHandler<never> }) {
  return factory.createMiddleware(async (c, next) => {
    for (const [name, handler] of Object.entries(effects)) {
      c.var.fx.effectRegistry.register(name, handler)
    }
    await next()
  })
}
