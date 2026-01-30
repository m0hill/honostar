import { defineCommand } from "@honostar/core/server"

const SAMPLE =
  "This is a fake token stream meant to demonstrate the streaming primitive in Honostar. " +
  "In a real app, you would forward tokens from an LLM provider and stream them to the browser."

export const GET = defineCommand({
  async handler(c) {
    const clientId = c.var.clientId
    c.var.bus.abortClientStream?.(clientId, "ai-tokens")

    const stream = c.var.fx.streamClient("ai-tokens", {
      qos: { lane: "bulk", key: "ai-tokens", drop: true },
    })

    stream.open({ kind: "ai-tokens" })
    stream.signals({ _tokens: "", _running: true, _status: "streaming" })

    void (async () => {
      const words = SAMPLE.split(/\s+/).filter(Boolean)
      for (const word of words) {
        if (stream.abortSignal?.aborted) break
        stream.chunkText(`${word} `, {
          coalesceMs: 50,
          target: { signal: "_tokens", mode: "append" },
        })
        await new Promise((r) => setTimeout(r, 35))
      }

      stream.flush()
      if (stream.abortSignal?.aborted) {
        stream.signals({ _running: false, _status: "stopped" })
      } else {
        stream.signals({ _running: false, _status: "done" })
      }
      stream.close()
    })().catch((err) => {
      stream.signals({ _running: false, _status: "error" })
      stream.error(err instanceof Error ? err.message : String(err))
    })

    return c.var.fx.ok()
  },
})
