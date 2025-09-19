import type { MiddlewareHandler } from 'hono'
import type { JSX } from 'hono/jsx/jsx-runtime'
import { jsxRenderer } from 'hono/jsx-renderer'

function stripDoctype(html: string): string {
  return html.replace(/^\s*<!DOCTYPE html>\s*/i, '')
}

export function renderer(): MiddlewareHandler {
  const base = jsxRenderer(({ children }) => {
    return (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, viewport-fit=cover"
          />
          <title>Bonsai</title>
          <link rel="stylesheet" href="/styles.css" />
          <script src="/datastar.js" />
        </head>
        <body data-on-load="@get('/_/events')">{children}</body>
      </html>
    )
  })

  return async (c, next) => {
    await base(c, async () => {
      c.set('renderToString', async (node: JSX.Element) => {
        const res = await c.render(node)
        const html = await res.text()
        return stripDoctype(html)
      })
      await next()
    })
  }
}