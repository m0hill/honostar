import type { Handler } from 'hono'
import { streamSSE } from 'hono/streaming'
import { bus } from '@/core/bus'

export const sseEndpoint = (): Handler => {
  return async c => {
    const clientId = c.var.clientId
    const topicsParam = c.req.query('topics')?.trim() ?? ''
    const topics = topicsParam
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    return streamSSE(c, async stream => {
      const unsubs: Array<() => void> = []

      unsubs.push(
        bus.subscribeClient(clientId, async msg => {
          await stream.writeSSE(msg)
        })
      )

      for (const t of topics) {
        unsubs.push(
          bus.subscribeTopic(t, async msg => {
            await stream.writeSSE(msg)
          })
        )
      }

      await stream.writeSSE({
        event: 'connected',
        data: JSON.stringify({ clientId, topics }),
      })

      stream.onAbort(() => {
        for (const u of unsubs) u()
      })
    })
  }
}