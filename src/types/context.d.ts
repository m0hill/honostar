import type { DB } from '@/db'
import type { User } from '@/types'
import type { AppVariablesBase } from '@/honostar/server'

declare module '@/honostar/server' {
  interface AppVariables extends AppVariablesBase {
    db: DB
    user: User | null
  }
}
