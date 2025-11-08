import type { Handler } from 'hono'
import { streamSSE } from 'hono/streaming'
import type { SSEPayload } from '@/core/datastar/bus'
import { SseFormatter } from '@/core/datastar/generator'

export const createSseEndpoint = (): Handler => {
  return c =>
    streamSSE(c, async stream => {
      const clientId = c.var.clientId
      const bus = c.var.bus
      if (clientId === 'anonymous') {
        console.error('[SSE] Anonymous client connection rejected.')
        await stream.close()
        return
      }
      const unsubscribes: (() => void)[] = []
      const formatter = new SseFormatter()

      await stream.writeSSE({ data: '', event: 'connection-established', id: clientId })
      const ping = setInterval(() => {
        void stream.writeSSE({ event: 'ping', data: '' })
      }, 25000)

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
            clearInterval(ping)
          } finally {
            void stream.close()
          }
        }
      }

      unsubscribes.push(bus.subscribeClient(clientId, handleMessage))

      const topicsParam = c.req.query('topics')
      const requestTopics = topicsParam ? topicsParam.split(',') : []
      for (const topic of requestTopics) {
        unsubscribes.push(bus.subscribeTopic(topic, handleMessage))
      }

      stream.onAbort(() => {
        console.log(`[SSE] Abort stream for client ${clientId}`)
        unsubscribes.forEach(unsub => unsub?.())
        clearInterval(ping)
      })

      await new Promise(() => {})
    })
}
