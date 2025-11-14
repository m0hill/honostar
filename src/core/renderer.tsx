import type { JSX } from 'hono/jsx/jsx-runtime'
import { jsxRenderer } from 'hono/jsx-renderer'
import type { BonsaiConfig } from '@/core/config'
import { createConfig } from '@/core/config'
import { factory } from '@/core/middleware'
import { signTopics } from '@/core/security/topics'
import { resolveThemeProvider } from '@/core/theme'

function stripDoctype(html: string): string {
  return html.replace(/^\s*<!DOCTYPE html>\s*/i, '')
}

function extractBodyInner(html: string): string {
  const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  if (m && m[1]) return m[1].trim()
  return html.trim()
}

function generateNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
}

/**
 * Renderer factory that accepts optional configuration
 * Returns middleware that injects HTML shell with configured assets and CSP
 */
export const renderer = (userConfig?: Partial<BonsaiConfig>) => {
  const config = createConfig(userConfig)

  return factory.createMiddleware(async (c, next) => {
    // Read theme preference from cookie if available
    const cookieHeader = c.req.header('cookie')
    const storageKey = c.var.theme?.storageKey ?? 'bonsai-ui-theme'
    let cookiePreference: string | null = null

    if (cookieHeader) {
      const cookieMatch = cookieHeader.match(new RegExp(`${storageKey}=([^;]+)`))
      if (cookieMatch?.[1]) {
        cookiePreference = cookieMatch[1]
      }
    }

    const theme = resolveThemeProvider(c.var.theme, cookiePreference)
    const scriptNonce = generateNonce()

    // Sign and set topic allowlist cookie before rendering
    const topics = c.var.sseTopics ?? []
    await signTopics(c, topics, config)
    const base = jsxRenderer(({ children }) => {
      const topics = c.var.sseTopics ?? []
      const topicsQuery = topics.length > 0 ? `?topics=${topics.join(',')}` : ''
      const runtimeData = {
        csrfToken: c.var.csrfToken ?? null,
        theme: theme.config,
        assets: {
          datastar: config.assets.datastar,
        },
      }
      const runtimeDataJson = JSON.stringify(runtimeData).replace(/</g, '\\u003c')
      const csp = config.security.csp.replace('${nonce}', scriptNonce)
      return (
        <html
          lang="en"
          class={theme.initialClass}
          data-theme-default={theme.config.defaultTheme}
          data-theme-provider="bonsai"
        >
          <head>
            <meta charSet="utf-8" />
            <meta name="color-scheme" content="dark light" />
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1, viewport-fit=cover"
            />
            {/* Datastar evaluates expressions with Function(), so CSP must allow unsafe-eval */}
            <meta httpEquiv="Content-Security-Policy" content={csp} />
            <meta name="csrf-token" content={c.var.csrfToken ?? ''} />
            <script
              id="runtime-data"
              type="application/json"
              dangerouslySetInnerHTML={{ __html: runtimeDataJson }}
            />
            <script
              id="theme-bootstrap"
              nonce={scriptNonce}
              dangerouslySetInnerHTML={{ __html: theme.bootstrapScript }}
            />
            <title>Bonsai</title>
            <link rel="stylesheet" href={config.assets.css} />
            <link rel="modulepreload" href={config.assets.datastar} />
            <link rel="modulepreload" href={config.assets.runtime} />
            {/* Load Datastar first so plugins can register with it */}
            <script type="module" src={config.assets.datastar} />
            <script type="module" src={config.assets.runtime} />

            {/* Opt-in to native MPA view transitions and set subtle, fast defaults */}
            <style
              dangerouslySetInnerHTML={{
                __html: `
              @view-transition { navigation: auto; }
              /* Explicitly participate in VT */
              html {
                view-transition-name: root;
              }
              body { background: transparent; }
              /* Keep MPA transition short and smooth without fancy motion */
              ::view-transition-group(root) {
                animation-duration: 220ms;
                animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
              }
              /* Avoid scrollbars flickering during VT composition */
              ::view-transition-old(root),
              ::view-transition-new(root) {
                overflow: clip;
              }
              /* Suppress outline on programmatic focus to #app */
              #app:focus { outline: none; }
              /* Respect reduced motion */
              @media (prefers-reduced-motion: reduce) {
                ::view-transition-group(*),
                ::view-transition-old(*),
                ::view-transition-new(*) {
                  animation: none !important;
                }
              }

              /* Minimal dialog defaults so inner content can use Tailwind */
              dialog {
                border: none;
                padding: 0;
                background: transparent;
                color: inherit;
              }
              dialog::backdrop {
                background: rgba(0, 0, 0, 0.6);
                -webkit-backdrop-filter: blur(2px);
                backdrop-filter: blur(2px);
              }
            `,
              }}
            />

            <link rel="expect" href="#app" blocking="render" />
          </head>
          <body data-init={`@get('${config.endpoints.sse}${topicsQuery}')`}>
            <div id="app">
              {children}
              {/* Hidden element for inspector to read all signals - must be inside app to access scoped signals */}
              <pre id="ds-inspector-signals" data-json-signals style="display:none;"></pre>
            </div>
            {/* Global overlay host for modals/overlays, persists across in-app navigations */}
            <div id="ds-overlays" aria-live="polite"></div>
            {/* Toast notification container, fixed to top-right */}
            <div
              id="toast-container"
              class="fixed top-4 right-4 z-50 flex flex-col items-end gap-2"
              aria-live="polite"
            ></div>
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
}
