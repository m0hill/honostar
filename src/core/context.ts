import type { Handler, MiddlewareHandler } from 'hono'
import type { JSX } from 'hono/jsx/jsx-runtime'
import type { Bus } from '@/core/bus'
import type { DB } from '@/db'

export type AppVariables = {
  db: DB
  bus: Bus
  clientId: string
  renderToString: (jsx: JSX.Element) => Promise<string>
  renderFragmentToString: (jsx: JSX.Element) => Promise<string>
  sseTopics?: string[]
  datastar: import('@/core/sse-helpers').DatastarResponder
}

export type AppEnv = {
  Variables: AppVariables
}

export type AppHandler = Handler<AppEnv> | MiddlewareHandler<AppEnv>
