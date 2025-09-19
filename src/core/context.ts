import type { JSX } from 'hono/jsx/jsx-runtime'
import type { DB } from '@/db'
import type { Bus } from './bus'

export type AppVariables = {
  db: DB
  bus: Bus
  clientId: string
  renderToString: (jsx: JSX.Element) => Promise<string>
}

export type AppEnv = {
  Variables: AppVariables
}
