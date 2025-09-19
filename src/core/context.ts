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
}

export type AppEnv = {
  Variables: AppVariables
}
