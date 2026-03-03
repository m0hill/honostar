import type { AppEnv } from "@honostar/core/server"

export type WorkerEnv = {
  Bindings: CloudflareBindings
  Variables: AppEnv["Variables"]
}
