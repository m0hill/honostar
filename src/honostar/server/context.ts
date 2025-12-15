import type { Handler, MiddlewareHandler } from 'hono'
import type { JSX } from 'hono/jsx/jsx-runtime'
import type { ThemeOptions } from '@/honostar/common/theme'
import type { ResolvedPageHead } from '@/honostar/server/page'
import type { FxResponse } from '@/honostar/server/sse/middleware'
import type { PubSubBus } from '@/honostar/server/sse/pubsub/memory'

export interface AppVariablesBase {
  bus: PubSubBus
  clientId: string
  renderToString: (jsx: JSX.Element) => Promise<string>
  renderFragmentToString: (jsx: JSX.Element) => Promise<string>
  sseTopics?: string[]
  pageHead?: ResolvedPageHead
  fx: import('@/honostar/server/sse/responder').FxResponder
  queries?: import('@/honostar/server/sse/queries').TopicQueryRegistry
  fxResponse?: FxResponse
  csrfToken?: string
  theme?: ThemeOptions
}

export interface AppVariables extends AppVariablesBase {}

export type AppEnv = {
  Variables: AppVariables
}

export type AppHandler = Handler<AppEnv> | MiddlewareHandler<AppEnv>
