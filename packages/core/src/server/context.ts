import type { Handler, MiddlewareHandler } from "hono"
import type { JSX } from "hono/jsx/jsx-runtime"
import type { ThemeOptions } from "../common/theme"
import type { ResolvedPageHead } from "./page"
import type { RegionRegistry } from "./regions"
import type { PubSubBus } from "./sse/pubsub/memory"

export interface AppVariablesBase {
  bus: PubSubBus
  clientId: string
  isDatastarRequest: boolean
  regionRegistry: RegionRegistry
  renderToString: (jsx: JSX.Element) => Promise<string>
  renderFragmentToString: (jsx: JSX.Element) => Promise<string>
  sseTopics?: string[]
  sseTopicsToken?: string
  sseParams?: Record<string, string>
  pageHead?: ResolvedPageHead
  fx: import("./sse/responder").FxResponder
  queries?: import("./sse/queries").TopicQueryRegistry
  csrfToken?: string
  theme?: ThemeOptions
}

export interface AppVariables extends AppVariablesBase {}

export type AppEnv = {
  Variables: AppVariables
}

export type AppHandler = Handler<AppEnv> | MiddlewareHandler<AppEnv>
