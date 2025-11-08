import type { DB } from '@/db'
import type { User } from '@/types'

declare module '@/core/context' {
  interface AppVariables {
    db: DB
    user: User | null
  }
}
