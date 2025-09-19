import type { Handler } from 'hono'
import { bus, type SSEPayload } from '@/core/bus'
import { ServerSentEventGenerator } from '@/core/datastar/generator'

export const sseEndpoint = (): Handler => {
  return c => {
    const clientId = c.var.clientId
    let unsubscribe: () => void

    return ServerSentEventGenerator.stream(
      stream => {
        const handleMessage = (msg: SSEPayload) => {
          if (msg.event === 'datastar-patch-elements') {
            stream.patchElements(msg.html, msg.options)
          } else if (msg.event === 'datastar-patch-signals') {
            stream.patchSignals(msg.signals, msg.options)
          }
        }

        unsubscribe = bus.subscribeClient(clientId, handleMessage)
      },
      {
        keepalive: true,
        onAbort: reason => {
          console.log(`[SSE] Stream aborted for client ${clientId}:`, reason)
          unsubscribe?.()
        },
        onError: error => {
          console.error(`[SSE] Stream error for client ${clientId}:`, error)
        },
      }
    )
  }
}
