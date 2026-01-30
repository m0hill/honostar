import { defineCommand } from "@honostar/core/server"
import { nextAsciiFrameByClient } from "./_state"

export const GET = defineCommand({
  async handler(c) {
    nextAsciiFrameByClient.delete(c.var.clientId)
    c.var.bus.abortClientStream?.(c.var.clientId, "bad-apple", "stopped")
    return c.var.fx.reply([
      [
        "patch-signals",
        {
          _running: false,
          _status: "stopped",
          _percentage: 0,
          _contents: "bad apple frames go here",
        },
      ],
    ])
  },
})
