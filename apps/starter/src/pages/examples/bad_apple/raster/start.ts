import { defineCommand } from "@honostar/core/server"
import { readFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { nextRasterFrameByClient } from "../_state"

const FRAMES_DIR = resolve(
  process.cwd(),
  "../../opensrc/repos/github.com/trung-kieen/bad-apple-ascii/frames-bad-apple"
)

const TOTAL_FRAMES = 6572
const FPS = 30
const FRAME_DURATION_MS = 1000 / FPS

async function loadFrameBase64(frameNum: number): Promise<string> {
  const fileName = `out${String(frameNum).padStart(4, "0")}.jpg`
  const filePath = join(FRAMES_DIR, fileName)
  try {
    const buf = await readFile(filePath)
    return buf.toString("base64")
  } catch {
    return ""
  }
}

export const GET = defineCommand({
  async handler(c) {
    const clientId = c.var.clientId
    c.var.bus.abortClientStream?.(clientId, "bad-apple-raster")

    const stream = c.var.fx.streamClient("bad-apple-raster", {
      qos: { lane: "bulk", key: "bad-apple-raster", drop: true },
    })

    stream.open({ fps: FPS, totalFrames: TOTAL_FRAMES, kind: "jpeg-base64" })
    stream.signals({ _running: true, _status: "playing" })

    void (async () => {
      const startFrame = nextRasterFrameByClient.get(clientId) ?? 1

      for (let currentFrame = startFrame; currentFrame <= TOTAL_FRAMES; currentFrame++) {
        if (stream.abortSignal?.aborted) break

        const startTime = Date.now()

        const b64 = await loadFrameBase64(currentFrame)
        const percentage = (currentFrame / TOTAL_FRAMES) * 100
        const src = b64 ? `data:image/jpeg;base64,${b64}` : ""

        stream.signals({ _percentage: percentage, _imgSrc: src })
        nextRasterFrameByClient.set(clientId, Math.min(TOTAL_FRAMES, currentFrame + 1))

        const elapsed = Date.now() - startTime
        const delay = Math.max(0, FRAME_DURATION_MS - elapsed)
        if (delay > 0) {
          await new Promise((r) => setTimeout(r, delay))
        }
      }

      if (!stream.abortSignal?.aborted) {
        nextRasterFrameByClient.delete(clientId)
        stream.signals({ _running: false, _status: "done" })
      } else {
        stream.signals({ _running: false, _status: "paused" })
      }

      stream.close()
    })().catch((err) => {
      stream.signals({ _running: false, _status: "error" })
      stream.error(err instanceof Error ? err.message : String(err))
    })

    return c.var.fx.ok()
  },
})
