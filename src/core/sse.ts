import type { Handler } from 'hono'
import { bus, type SSEPayload } from '@/core/bus'
import { ServerSentEventGenerator } from '@/core/datastar/generator'

export const sseEndpoint = (): Handler => {
  return c => {
    const clientId = c.var.clientId
    const unsubscribes: (() => void)[] = []

    return ServerSentEventGenerator.stream(
      stream => {
        stream.sendComment('connection-established')

        const handleMessage = (msg: SSEPayload) => {
          if (msg.event === 'datastar-patch-elements') {
            stream.patchElements(msg.html, msg.options)
          } else if (msg.event === 'datastar-patch-signals') {
            stream.patchSignals(msg.signals, msg.options)
          }
        }

        unsubscribes.push(bus.subscribeClient(clientId, handleMessage))

        const topics = c.var.sseTopics || []
        for (const topic of topics) {
          unsubscribes.push(bus.subscribeTopic(topic, handleMessage))
        }
      },
      {
        keepalive: true,
        onAbort: () => {
          unsubscribes.forEach(unsub => unsub?.())
        },
        onError: error => {
          console.error(`[SSE] Stream error for client ${clientId}:`, error)
        },
      }
    )
  }
}
