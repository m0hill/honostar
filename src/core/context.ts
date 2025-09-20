import type { Handler, MiddlewareHandler } from 'hono'
import type { JSX } from 'hono/jsx/jsx-runtime'
import type { Bus } from '@/core/datastar/bus'
import type { FxResponse } from '@/core/datastar/middleware'
import type { DB } from '@/db'

export type AppVariables = {
  db: DB
  bus: Bus
  clientId: string
  renderToString: (jsx: JSX.Element) => Promise<string>
  renderFragmentToString: (jsx: JSX.Element) => Promise<string>
  sseTopics?: string[]
  datastar: import('@/core/datastar/responder').DatastarResponder
  fxResponse?: FxResponse
}

export type AppEnv = {
  Variables: AppVariables
}

export type AppHandler = Handler<AppEnv> | MiddlewareHandler<AppEnv>
