import type { Handler, MiddlewareHandler } from 'hono'
import type { JSX } from 'hono/jsx/jsx-runtime'
import type { PubSubBus } from '@/core/datastar/bus'
import type { FxResponse } from '@/core/datastar/middleware'
import type { ThemeOptions } from '@/core/theme'

export interface AppVariablesBase {
  bus: PubSubBus
  clientId: string
  renderToString: (jsx: JSX.Element) => Promise<string>
  renderFragmentToString: (jsx: JSX.Element) => Promise<string>
  sseTopics?: string[]
  datastar: import('@/core/datastar/responder').DatastarResponder
  fxResponse?: FxResponse
  csrfToken?: string
  theme?: ThemeOptions
}

export interface AppVariables extends AppVariablesBase {}

export type AppEnv = {
  Variables: AppVariables
}

export type AppHandler = Handler<AppEnv> | MiddlewareHandler<AppEnv>
