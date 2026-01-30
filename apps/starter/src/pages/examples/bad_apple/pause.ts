import { defineCommand } from "@honostar/core/server"

export const GET = defineCommand({
  async handler(c) {
    c.var.bus.abortClientStream?.(c.var.clientId, "bad-apple", "paused")
    return c.var.fx.reply([["patch-signals", { _running: false, _status: "paused" }]])
  },
})
