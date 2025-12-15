import type { Context } from 'hono'
import type { JSX } from 'hono/jsx/jsx-runtime'
import type { AppEnv } from '@/honostar/server/context'

function acceptsHtml(c: Context<AppEnv>): boolean {
  const accept = c.req.header('accept')?.toLowerCase() ?? ''
  return accept.includes('text/html') || accept.includes('*/*')
}

function isDatastarRequest(c: Context<AppEnv>): boolean {
  return c.req.header('datastar-request') !== null
}

function NotFoundPage(props: { pathname: string }): JSX.Element {
  return (
    <main
      style={{
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji',
        padding: '48px 20px',
        maxWidth: '720px',
        margin: '0 auto',
      }}
    >
      <h1 style={{ fontSize: '28px', margin: '0 0 8px' }}>Not Found</h1>
      <p style={{ margin: '0 0 20px', opacity: 0.8 }}>
        No route matches <code>{props.pathname}</code>.
      </p>
      <p style={{ margin: 0 }}>
        <a href="/" style={{ color: 'inherit' }}>
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
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji',
        padding: '48px 20px',
        maxWidth: '720px',
        margin: '0 auto',
      }}
    >
      <h1 style={{ fontSize: '28px', margin: '0 0 8px' }}>Something went wrong</h1>
      <p style={{ margin: '0 0 20px', opacity: 0.8 }}>
        {props.message ? props.message : 'An unexpected error occurred.'}
        {props.requestId ? (
          <>
            {' '}
            (request <code>{props.requestId}</code>)
          </>
        ) : null}
      </p>
      {props.showStack && props.stack ? (
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
            padding: '12px',
            border: '1px solid rgba(127,127,127,0.35)',
            borderRadius: '8px',
            background: 'rgba(127,127,127,0.08)',
          }}
        >
          {props.stack}
        </pre>
      ) : null}
    </main>
  )
}

export function createNotFoundHandler() {
  return (c: Context<AppEnv>) => {
    if (!acceptsHtml(c) || isDatastarRequest(c)) {
      return c.text('Not Found', 404)
    }
    c.set('pageHead', { title: 'Not Found', elements: [] })
    c.status(404)
    return c.render(<NotFoundPage pathname={new URL(c.req.url).pathname} />)
  }
}

export function createOnErrorHandler(opts?: {
  showStack?: boolean
  getRequestId?: (c: Context<AppEnv>) => string | undefined
}) {
  return (err: unknown, c: Context<AppEnv>) => {
    const requestId = opts?.getRequestId?.(c)

    if (!acceptsHtml(c) || isDatastarRequest(c)) {
      return c.text('Internal Server Error', 500)
    }

    const message = err instanceof Error ? err.message : undefined
    const stack = err instanceof Error ? err.stack : undefined

    c.set('pageHead', { title: 'Server Error', elements: [] })
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
