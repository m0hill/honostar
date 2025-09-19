import type { MiddlewareHandler } from 'hono'
import type { JSX } from 'hono/jsx/jsx-runtime'
import { jsxRenderer } from 'hono/jsx-renderer'

export function renderer(): MiddlewareHandler {
  const base = jsxRenderer()

  return async (c, next) => {
    await base(c, async () => {
      c.set('renderToString', async (node: JSX.Element) => {
        const res = await c.render(node)
        return await res.text()
      })
      await next()
    })
  }
}
