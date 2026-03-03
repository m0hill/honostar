import type { Context } from "hono"
import type { JSX } from "hono/jsx/jsx-runtime"
import type { AppEnv } from "./context"
import { isDatastarRequest } from "./request"

function acceptsHtml(c: Context<AppEnv>): boolean {
  const accept = c.req.header("accept")?.toLowerCase() ?? ""
  return accept.includes("text/html") || accept.includes("*/*")
}

function detectMiswireMessage(err: unknown): string | null {
  if (!(err instanceof Error)) return null
  const message = err.message
  const stack = err.stack ?? ""
  const likelyFxPropertyRead =
    message.includes("Cannot read properties of undefined") &&
    ["reply", "broadcast", "publish", "publishTo", "ok", "respond", "effectRegistry"].some((key) =>
      message.includes(`'${key}'`)
    )

  if (
    message.includes("c.var.fx is unavailable") ||
    likelyFxPropertyRead ||
    stack.includes(".var.fx.") ||
    stack.includes(".var.fx")
  ) {
    return (
      "[Honostar] Missing FX responder middleware. " +
      "Add app.use('*', initContext) and app.use('*', fxResponder) before route mounting."
    )
  }

  return null
}

function NotFoundPage(props: { pathname: string }): JSX.Element {
  return (
    <main
      style={{
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji",
        padding: "48px 20px",
        maxWidth: "720px",
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: "28px", margin: "0 0 8px" }}>Not Found</h1>
      <p style={{ margin: "0 0 20px", opacity: 0.8 }}>
        No route matches <code>{props.pathname}</code>.
      </p>
      <p style={{ margin: 0 }}>
        <a href="/" style={{ color: "inherit" }}>
          Go home
        </a>
      </p>
    </main>
  )
}

function ErrorPage(props: {
  message?: string | undefined
  requestId?: string | undefined
  showStack?: boolean
  stack?: string | undefined
}) {
  return (
    <main
      style={{
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji",
        padding: "48px 20px",
        maxWidth: "720px",
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: "28px", margin: "0 0 8px" }}>Something went wrong</h1>
      <p style={{ margin: "0 0 20px", opacity: 0.8 }}>
        {props.message ? props.message : "An unexpected error occurred."}
        {props.requestId ? (
          <>
            {" "}
            (request <code>{props.requestId}</code>)
          </>
        ) : null}
      </p>
      {props.showStack && props.stack ? (
        <pre
          style={{
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
            padding: "12px",
            border: "1px solid rgba(127,127,127,0.35)",
            borderRadius: "8px",
            background: "rgba(127,127,127,0.08)",
          }}
        >
          {props.stack}
        </pre>
      ) : null}
    </main>
  )
}

export function createNotFoundHandler(opts?: { ssePath?: string }) {
  const ssePath = opts?.ssePath ?? "/_/events"
  return (c: Context<AppEnv>) => {
    const pathname = new URL(c.req.url).pathname
    if (pathname === ssePath) {
      return c.text(
        `[Honostar] SSE endpoint "${ssePath}" is not mounted. ` +
          `Add app.get("${ssePath}", createSseEndpoint(config, ...)).`,
        404
      )
    }

    if (!acceptsHtml(c) || isDatastarRequest(c)) {
      return c.text("Not Found", 404)
    }
    c.set("pageHead", { title: "Not Found", elements: [] })
    c.status(404)
    return c.render(<NotFoundPage pathname={pathname} />)
  }
}

export function createOnErrorHandler(opts?: {
  showStack?: boolean
  getRequestId?: (c: Context<AppEnv>) => string | undefined
}) {
  return (err: unknown, c: Context<AppEnv>) => {
    const requestId = opts?.getRequestId?.(c)
    const miswire = detectMiswireMessage(err)

    if (!acceptsHtml(c) || isDatastarRequest(c)) {
      if (miswire) {
        return c.text(miswire, 500)
      }
      return c.text("Internal Server Error", 500)
    }

    const message = miswire ?? (err instanceof Error ? err.message : undefined)
    const stack = err instanceof Error ? err.stack : undefined

    c.set("pageHead", { title: "Server Error", elements: [] })
    c.status(500)
    return c.render(
      <ErrorPage
        message={message}
        requestId={requestId}
        showStack={opts?.showStack === true}
        stack={stack}
      />
    )
  }
}
