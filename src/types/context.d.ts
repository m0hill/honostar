import type { User } from '@/types'

declare module '@/core/context' {
  interface AppVariables {
    user: User | null
  }
}
