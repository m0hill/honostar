import { renderToString } from "hono/jsx/dom/server"
import type { JSX } from "hono/jsx/jsx-runtime"
import { jsxRenderer } from "hono/jsx-renderer"
import { resolveThemeProvider } from "../common/theme"
import type { HonostarConfig } from "./config"
import { createConfig } from "./config"
import { factory } from "./middleware"
import { signTopics } from "./security/topics"

function stripDoctype(html: string): string {
  return html.replace(/^\s*<!DOCTYPE html>\s*/i, "")
}

function withAssetVersion(path: string, version: string | undefined): string {
  if (!version) return path
  const trimmed = version.trim()
  if (!trimmed) return path
  return path.includes("?")
    ? `${path}&v=${encodeURIComponent(trimmed)}`
    : `${path}?v=${encodeURIComponent(trimmed)}`
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
export const renderer = (userConfig?: Partial<HonostarConfig>) => {
  const config = createConfig(userConfig)

  return factory.createMiddleware(async (c, next) => {
    // Read theme preference from cookie if available
    const cookieHeader = c.req.header("cookie")
    const storageKey = c.var.theme?.storageKey ?? "honostar-ui-theme"
    let cookiePreference: string | null = null

    if (cookieHeader) {
      const cookieMatch = cookieHeader.match(new RegExp(`${storageKey}=([^;]+)`))
      if (cookieMatch?.[1]) {
        cookiePreference = cookieMatch[1]
      }
    }

    const theme = resolveThemeProvider(c.var.theme, cookiePreference)
    const scriptNonce = generateNonce()

    const base = jsxRenderer(({ children }) => {
      const pageHead = c.var.pageHead
      const topics = c.var.sseTopics ?? []
      const sseParams = c.var.sseParams ?? {}
      const topicsToken = c.var.sseTopicsToken
      const params = new URLSearchParams()
      if (topics.length > 0) params.set("topics", topics.join(","))
      for (const [key, value] of Object.entries(sseParams)) {
        if (value !== undefined && value !== null && String(value).length > 0) {
          params.set(key, String(value))
        }
      }
      if (topicsToken) params.set("topicsToken", topicsToken)
      const topicsQuery = params.size > 0 ? `?${params.toString()}` : ""
      const runtimeData = {
        csrfToken: c.var.csrfToken ?? null,
        theme: theme.config,
        assets: {
          css: withAssetVersion(config.assets.css, config.assets.version),
          runtime: withAssetVersion(config.assets.runtime, config.assets.version),
          datastar: withAssetVersion(config.assets.datastar, config.assets.version),
          plugins: (config.assets.plugins ?? []).map((p) =>
            withAssetVersion(p, config.assets.version)
          ),
        },
        devtools: {
          inspector: config.devtools?.inspector ?? null,
        },
      }
      const runtimeDataJson = JSON.stringify(runtimeData).replace(/</g, "\\u003c")
      const csp = config.security.csp.replace("${nonce}", scriptNonce)
      const title = pageHead?.title ?? config.document?.title ?? "Honostar"
      const lang = pageHead?.lang ?? config.document?.lang ?? "en"
      return (
        <html
          lang={lang}
          class={theme.initialClass}
          data-theme-default={theme.config.defaultTheme}
          data-theme-provider="honostar"
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
            <meta name="csrf-token" content={c.var.csrfToken ?? ""} />
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
            <title>{title}</title>
            {pageHead?.elements}
            <link
              rel="stylesheet"
              href={withAssetVersion(config.assets.css, config.assets.version)}
            />
            <link
              rel="modulepreload"
              href={withAssetVersion(config.assets.datastar, config.assets.version)}
            />
            <link
              rel="modulepreload"
              href={withAssetVersion(config.assets.runtime, config.assets.version)}
            />
            {/* Load Datastar first so plugins can register with it */}
            <script
              type="module"
              src={withAssetVersion(config.assets.datastar, config.assets.version)}
            />
            <script
              type="module"
              src={withAssetVersion(config.assets.runtime, config.assets.version)}
            />

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
      const originalRender = c.render?.bind(c)
      if (originalRender) {
        ;(c as unknown as { render: typeof originalRender }).render = async (...args) => {
          const topics = c.var.sseTopics ?? []
          const token = await signTopics(c, topics, config)
          if (token) c.set("sseTopicsToken", token)
          return await originalRender(...args)
        }
      }

      c.set("renderToString", async (node: JSX.Element) => {
        const res = await c.render(node)
        const html = await res.text()
        return stripDoctype(html)
      })
      c.set("renderFragmentToString", async (node: JSX.Element) => {
        return renderToString(node)
      })
      await next()
    })
  })
}
