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
    const topics = c.var.sseTopics ?? []
    const topicsQuery = topics.length > 0 ? `?topics=${topics.join(',')}` : ''
    return (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
          <script
            dangerouslySetInnerHTML={{
              __html: `
            // Per-tab ID so server can target SSE effects to a tab
            (function() {
              let tabId = sessionStorage.getItem('tabId');
              if (!tabId) {
                tabId = crypto.randomUUID();
                sessionStorage.setItem('tabId', tabId);
              }
              // Ensure Datastar fetches (incl. SSE GET) carry the tab id
              const originalFetch = window.fetch;
              window.fetch = function(input, init) {
                init = init || {};
                init.headers = { ...init.headers, 'X-Tab-ID': tabId };
                return originalFetch(input, init);
              };
            })();
            // Progressive View Transitions for same-origin link clicks
            (function () {
              if (!document.startViewTransition) return;
              addEventListener('click', function (e) {
                const t = e.target;
                const a = t && t.closest && t.closest('a');
                if (!a) return;
                if (a.target || a.hasAttribute('download') || a.hasAttribute('data-no-vt')) return;
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                const url = new URL(a.getAttribute('href') || '', location.href);
                if (url.origin !== location.origin) return;
                e.preventDefault();
                document.startViewTransition(function() { location.href = url.href; });
              }, { capture: true });
            })();
          `,
            }}
          />
          <title>Bonsai</title>
          <link rel="stylesheet" href="/styles.css" />
          <script type="module" src="/datastar.js" />
        </head>
        <body data-on-load={`@get('/_/events${topicsQuery}')`}>
          <div id="app">{children}</div>
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
