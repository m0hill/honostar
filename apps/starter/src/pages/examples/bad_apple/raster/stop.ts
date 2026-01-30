import { defineCommand } from "@honostar/core/server"
import { nextRasterFrameByClient } from "../_state"

export const GET = defineCommand({
  async handler(c) {
    nextRasterFrameByClient.delete(c.var.clientId)
    c.var.bus.abortClientStream?.(c.var.clientId, "bad-apple-raster", "stopped")
    return c.var.fx.reply([
      [
        "patch-signals",
        {
          _running: false,
          _status: "stopped",
          _percentage: 0,
          _imgSrc: "",
        },
      ],
    ])
  },
})
