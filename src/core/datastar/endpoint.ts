import type { Handler } from 'hono'
import { streamSSE } from 'hono/streaming'
import { bus, type SSEPayload } from '@/core/datastar/bus'
import { SseFormatter } from '@/core/datastar/generator'

export const createSseEndpoint = (): Handler => {
  return c =>
    streamSSE(c, async stream => {
      const clientId = c.var.clientId
      const unsubscribes: (() => void)[] = []
      const formatter = new SseFormatter()

      await stream.writeSSE({ data: '', event: 'connection-established', id: clientId })

      const handleMessage = (msg: SSEPayload) => {
        if (msg.event === 'datastar-patch-elements') {
          const eventString = formatter.patchElements(msg.html, msg.options)
          void stream.write(eventString)
        } else if (msg.event === 'datastar-patch-signals') {
          const eventString = formatter.patchSignals(msg.signals, msg.options)
          void stream.write(eventString)
        } else if (msg.event === 'execute-script') {
          const eventString = formatter.executeScript(msg.script, msg.options)
          void stream.write(eventString)
        } else if (msg.event === 'close') {
          try {
            unsubscribes.forEach(u => u?.())
          } finally {
            void stream.close()
          }
        }
      }

      unsubscribes.push(bus.subscribeClient(clientId, handleMessage))

      const topics = c.var.sseTopics || []
      for (const topic of topics) {
        unsubscribes.push(bus.subscribeTopic(topic, handleMessage))
      }

      stream.onAbort(() => {
        console.log(`[SSE] Abort stream for client ${clientId}`)
        unsubscribes.forEach(unsub => unsub?.())
      })
    })
}
