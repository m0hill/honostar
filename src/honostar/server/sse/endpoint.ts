import type { Handler } from 'hono'
import { streamSSE } from 'hono/streaming'
import type { HonostarConfig } from '@/honostar/server/config'
import { createConfig } from '@/honostar/server/config'
import { verifyTopics } from '@/honostar/server/security/topics'
import type { SSEPayload } from '@/honostar/server/sse/bus'
import { SseFormatter } from '@/honostar/server/sse/generator'

/**
 * Creates an SSE endpoint handler with optional configuration
 * @param userConfig - Optional partial HonostarConfig (merged with defaults)
 */
export const createSseEndpoint = (userConfig?: Partial<HonostarConfig>): Handler => {
  const config = createConfig(userConfig)
  const pingMs = config.sse?.pingIntervalMs ?? 25000
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
      }, pingMs)

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

      // Always subscribe to client-specific messages
      unsubscribes.push(bus.subscribeClient(clientId, handleMessage))

      // Verify and enforce topic allowlist
      const topicsParam = c.req.query('topics')
      const requestedTopics = topicsParam ? topicsParam.split(',').filter(t => t.trim()) : []

      if (requestedTopics.length > 0) {
        const allowedTopics = await verifyTopics(c, requestedTopics, config)

        if (allowedTopics) {
          // Subscribe only to allowed topics
          for (const topic of allowedTopics) {
            unsubscribes.push(bus.subscribeTopic(topic, handleMessage))
          }
        } else {
          // Verification failed - log warning and skip topic subscriptions
          console.warn(
            `[SSE] Topic verification failed for client ${clientId}. ` +
              'Only client-specific messages will be delivered. ' +
              'Requested topics were not authorized.'
          )
        }
      }

      stream.onAbort(() => {
        console.log(`[SSE] Abort stream for client ${clientId}`)
        unsubscribes.forEach(unsub => unsub?.())
        clearInterval(ping)
      })

      await new Promise(() => {})
    })
}
