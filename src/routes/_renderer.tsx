import { jsxRenderer } from 'hono/jsx-renderer'

export default jsxRenderer(({ children }) => {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <title>Hono + Datastar + Bun</title>
        <link rel="stylesheet" href="/styles.css" />
        <script src="/datastar.js"></script>
      </head>
      <body data-on-load="(() => { if (!window.__events) { window.__events = new EventSource('/_/events'); } })()">
        {children}
      </body>
    </html>
  )
})
