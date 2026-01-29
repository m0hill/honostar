import type { DB } from "@/db"
import type { User } from "@/types"
import type { AppVariablesBase } from "@honostar/core/server"

declare module "@honostar/core/server" {
  interface AppVariables extends AppVariablesBase {
    db: DB
    user: User | null
  }
}
