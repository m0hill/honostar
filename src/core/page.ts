import type { Context, MiddlewareHandler } from 'hono'
import type { JSX } from 'hono/jsx/jsx-runtime'
import type { AppEnv } from '@/core/context'
import type { FxResponse } from '@/core/datastar/middleware'

type PageLoader<T extends Record<string, unknown> = {}> = (
  c: Context<AppEnv>
) => Promise<T | Response>

type PageComponent<T extends Record<string, unknown> = {}> = (props: T) => JSX.Element

type PageTopics = string[] | ((c: Context<AppEnv>) => string[] | Promise<string[]>)

export interface PageDefinition<T extends Record<string, unknown> = {}> {
  use?: MiddlewareHandler<AppEnv>[]
  loader?: PageLoader<T>
  component: PageComponent<T>
  topics?: PageTopics
}

export interface HandlerDefinition {
  use?: MiddlewareHandler<AppEnv>[]
  handler: (c: Context<AppEnv>) => Promise<Response | FxResponse>
}

export function createPage<T extends Record<string, unknown>>(
  definition: PageDefinition<T>
): PageDefinition<T> {
  return definition
}

export function createHandler(definition: HandlerDefinition): HandlerDefinition {
  return definition
}
