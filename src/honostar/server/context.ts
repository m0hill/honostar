import type { Handler, MiddlewareHandler } from 'hono'
import type { JSX } from 'hono/jsx/jsx-runtime'
import type { ThemeOptions } from '@/honostar/common/theme'
import type { FxResponse } from '@/honostar/server/sse/middleware'
import type { PubSubBus } from '@/honostar/server/sse/pubsub/bus'

export interface AppVariablesBase {
  bus: PubSubBus
  clientId: string
  renderToString: (jsx: JSX.Element) => Promise<string>
  renderFragmentToString: (jsx: JSX.Element) => Promise<string>
  sseTopics?: string[]
  datastar: import('@/honostar/server/sse/responder').DatastarResponder
  fxResponse?: FxResponse
  csrfToken?: string
  theme?: ThemeOptions
}

export interface AppVariables extends AppVariablesBase {}

export type AppEnv = {
  Variables: AppVariables
}

export type AppHandler = Handler<AppEnv> | MiddlewareHandler<AppEnv>
