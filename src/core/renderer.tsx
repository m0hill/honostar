import type { JSX } from 'hono/jsx/jsx-runtime'
import { jsxRenderer } from 'hono/jsx-renderer'
import { factory } from '@/core/middleware'

function stripDoctype(html: string): string {
  return html.replace(/^\s*<!DOCTYPE html>\s*/i, '')
}

function extractBodyInner(html: string): string {
  const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  if (m && m[1]) return m[1].trim()
  return html.trim()
}

export const renderer = factory.createMiddleware(async (c, next) => {
  const base = jsxRenderer(({ children }) => {
    return (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
          <title>Bonsai</title>
          <link rel="stylesheet" href="/styles.css" />
          <script type="module" src="/datastar.js" />
        </head>
        <body data-on-load="@get('/_/events')" data-on-popstate__window="@get(location.pathname)">
          {children}
        </body>
      </html>
    )
  })

  await base(c, async () => {
    c.set('renderToString', async (node: JSX.Element) => {
      const res = await c.render(node)
      const html = await res.text()
      return stripDoctype(html)
    })
    c.set('renderFragmentToString', async (node: JSX.Element) => {
      const res = await c.render(node)
      const html = await res.text()
      return extractBodyInner(stripDoctype(html))
    })
    await next()
  })
})
