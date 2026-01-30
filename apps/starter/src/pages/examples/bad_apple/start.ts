import { defineCommand } from "@honostar/core/server"
import { readFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { nextAsciiFrameByClient } from "./_state"

const FRAMES_DIR = resolve(
  process.cwd(),
  "../../opensrc/repos/github.com/trung-kieen/bad-apple-ascii/frames-ascii"
)

const TOTAL_FRAMES = 6572
const FPS = 30
const FRAME_DURATION_MS = 1000 / FPS

async function loadFrame(frameNum: number): Promise<string> {
  const fileName = `out${String(frameNum).padStart(4, "0")}.jpg.txt`
  const filePath = join(FRAMES_DIR, fileName)
  try {
    return await readFile(filePath, "utf-8")
  } catch {
    return ""
  }
}

export const GET = defineCommand({
  async handler(c) {
    const clientId = c.var.clientId
    c.var.bus.abortClientStream?.(clientId, "bad-apple")

    const stream = c.var.fx.streamClient("bad-apple", {
      qos: { lane: "bulk", key: "bad-apple", drop: true },
    })

    stream.open({ fps: FPS, totalFrames: TOTAL_FRAMES })
    stream.signals({ _running: true, _status: "playing" })

    void (async () => {
      const startFrame = nextAsciiFrameByClient.get(clientId) ?? 1

      for (let currentFrame = startFrame; currentFrame <= TOTAL_FRAMES; currentFrame++) {
        if (stream.abortSignal?.aborted) break

        const startTime = Date.now()

        const contents = await loadFrame(currentFrame)
        const percentage = (currentFrame / TOTAL_FRAMES) * 100

        stream.signals({ _percentage: percentage, _contents: contents })
        nextAsciiFrameByClient.set(clientId, Math.min(TOTAL_FRAMES, currentFrame + 1))

        const elapsed = Date.now() - startTime
        const delay = Math.max(0, FRAME_DURATION_MS - elapsed)
        if (delay > 0) {
          await new Promise((r) => setTimeout(r, delay))
        }
      }

      if (!stream.abortSignal?.aborted) {
        nextAsciiFrameByClient.delete(clientId)
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
