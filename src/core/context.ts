import type { InferSelectModel } from 'drizzle-orm'
import type { Handler, MiddlewareHandler } from 'hono'
import type { JSX } from 'hono/jsx/jsx-runtime'
import type { Bus } from '@/core/datastar/bus'
import type { FxResponse } from '@/core/datastar/middleware'
import type { DB } from '@/db'
import type { users } from '@/db/schema'

export type User = InferSelectModel<typeof users>

export type AppVariables = {
  db: DB
  bus: Bus
  clientId: string
  renderToString: (jsx: JSX.Element) => Promise<string>
  renderFragmentToString: (jsx: JSX.Element) => Promise<string>
  sseTopics?: string[]
  datastar: import('@/core/datastar/responder').DatastarResponder
  fxResponse?: FxResponse
  user: User | null
}

export type AppEnv = {
  Variables: AppVariables
}

export type AppHandler = Handler<AppEnv> | MiddlewareHandler<AppEnv>
