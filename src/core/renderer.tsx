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
          <meta name="color-scheme" content="dark light" />
          <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
          <meta name="csrf-token" content={c.var.csrfToken ?? ''} />
          <script
            dangerouslySetInnerHTML={{
              __html: `
            (function() {
              let tabId = sessionStorage.getItem('tabId');
              if (!tabId) {
                tabId = crypto.randomUUID();
                sessionStorage.setItem('tabId', tabId);
              }
              const originalFetch = window.fetch;
              window.fetch = function(input, init) {
                init = init || {};
                var meta = document.querySelector('meta[name="csrf-token"]');
                var csrf = meta && meta.getAttribute('content');
                var h = new Headers(init.headers || {});
                h.set('X-Tab-ID', tabId);
                if (csrf) h.set('X-CSRF-Token', csrf);
                init.headers = h;
                return originalFetch(input, init);
              };
            })();

            // Data-aware prefetch for same-origin pages on hover (no UI changes).
            (function () {
              var seen = new Set();
              var conn = navigator.connection;
              var saveData = !!(conn && conn.saveData);
              var slow = !!(conn && (conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g'));
              var enabled = !(saveData || slow);
              function prefetch(href) {
                if (seen.has(href)) return;
                seen.add(href);
                var l = document.createElement('link');
                l.rel = 'prefetch';
                l.href = href;
                document.head.appendChild(l);
              }
              if (enabled) {
                addEventListener('pointerover', function (e) {
                  var t = e.target;
                  var a = t && t.closest && t.closest('a');
                  if (!a || a.target || a.hasAttribute('download')) return;
                  var href = a.getAttribute('href') || '';
                  if (!href) return;
                  var url = new URL(href, location.href);
                  if (url.origin !== location.origin) return;
                  prefetch(url.href);
                }, { capture: true });
              }
            })();

            // Image loading defaults: lazy + async decoding (safe, zero visual change).
            (function () {
              function enhanceImages(root) {
                var imgs = (root || document).querySelectorAll('img');
                for (var i = 0; i < imgs.length; i++) {
                  var img = imgs[i];
                  if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
                  if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
                }
              }
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function(){ enhanceImages(); }, { once: true });
              } else {
                enhanceImages();
              }
              // If your framework patches DOM, you can re-run enhanceImages on fragments as needed.
            })();

            // A11y: focus main app container when the page is revealed.
            (function () {
              var focusApp = function () {
                var app = document.getElementById('app');
                if (app) {
                  if (!app.hasAttribute('tabindex')) app.setAttribute('tabindex', '-1');
                  try { app.focus({ preventScroll: true }); } catch (_) { /* noop */ }
                }
              };
              addEventListener('pagereveal', focusApp, { once: true });
            })();
          `,
            }}
          />
          <title>Bonsai</title>
          <link rel="stylesheet" href="/styles.css" />
          <link rel="modulepreload" href="/datastar.js" />

          {/* Opt-in to native MPA view transitions and set subtle, fast defaults */}
          <style
            dangerouslySetInnerHTML={{
              __html: `
              @view-transition { navigation: auto; }
              /* Prevent white flash before CSS; explicitly participate in VT */
              html {
                background: #0b0f1a;
                color-scheme: dark;
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
            `,
            }}
          />

          <link rel="expect" href="#app" blocking="render" />
          <script type="module" src="/datastar.js" />
        </head>
        <body data-init={`@get('/_/events${topicsQuery}')`}>
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
