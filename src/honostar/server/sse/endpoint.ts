import type { Handler } from 'hono'
import type { JSX } from 'hono/jsx/jsx-runtime'
import { streamSSE } from 'hono/streaming'
import type {
  ExecuteScriptOptions,
  Jsonifiable,
  PatchElementsOptions,
  PatchSignalsOptions,
} from '@/honostar/common/types'
import type { HonostarConfig } from '@/honostar/server/config'
import { createConfig } from '@/honostar/server/config'
import { verifyTopics } from '@/honostar/server/security/topics'
import type { EffectDefinition } from '@/honostar/server/sse/effect-registry'
import { SseFormatter } from '@/honostar/server/sse/generator'
import type { SSEPayload } from '@/honostar/server/sse/pubsub/memory'
import { TopicQueryRegistry } from '@/honostar/server/sse/queries'

type DomainEvent = { name: string; payload: Jsonifiable | null }

const isPatchElementsEffect = (
  fx: EffectDefinition
): fx is ['patch-elements', JSX.Element | JSX.Element[] | string, PatchElementsOptions?] =>
  fx[0] === 'patch-elements'

const isPatchElementsSeqEffect = (
  fx: EffectDefinition
): fx is ['patch-elements-seq', Array<JSX.Element | string>, PatchElementsOptions?] =>
  fx[0] === 'patch-elements-seq'

const isPatchSignalsEffect = (
  fx: EffectDefinition
): fx is ['patch-signals', Record<string, Jsonifiable>, PatchSignalsOptions?] =>
  fx[0] === 'patch-signals'

const isExecuteScriptEffect = (
  fx: EffectDefinition
): fx is ['execute-script', string, ExecuteScriptOptions?] => fx[0] === 'execute-script'

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function isJsonifiable(value: unknown): value is Jsonifiable {
  if (
    value === null ||
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return true
  }

  if (Array.isArray(value)) {
    return value.every(isJsonifiable)
  }

  if (isPlainRecord(value)) {
    return Object.values(value).every(isJsonifiable)
  }

  return false
}

function safeParseJsonifiable(value: string): Jsonifiable | null {
  try {
    const parsed = JSON.parse(value)
    return isJsonifiable(parsed) ? parsed : null
  } catch {
    return null
  }
}

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
      let writeChain: Promise<unknown> = Promise.resolve()

      const enqueue = (fn: () => Promise<unknown>) => {
        writeChain = writeChain.then(fn).catch(err => {
          console.error('[SSE] Write chain error', err)
        })
      }

      const renderNode = async (node: JSX.Element | string | null | undefined): Promise<string> => {
        if (node === null || node === undefined) return ''
        if (typeof node === 'string') return node
        return await c.var.renderFragmentToString(node)
      }

      const renderElementsPayload = async (
        payload: JSX.Element | JSX.Element[] | string
      ): Promise<string> => {
        if (Array.isArray(payload)) {
          const html = await Promise.all(payload.map(part => renderNode(part)))
          return html.join('\n')
        }
        return await renderNode(payload)
      }

      const renderElementsSeqPayload = async (
        payload: Array<JSX.Element | string>
      ): Promise<string> => {
        const html = await Promise.all(payload.map(part => renderNode(part)))
        return html.join('\n')
      }

      const writeEffectsToStream = async (effects: EffectDefinition[]) => {
        for (const fx of effects) {
          if (isPatchElementsEffect(fx)) {
            const [, payload, opts] = fx
            const html = await renderElementsPayload(payload)
            await stream.write(formatter.patchElements(html, opts ?? {}))
            continue
          }

          if (isPatchElementsSeqEffect(fx)) {
            const [, payload, opts] = fx
            const html = await renderElementsSeqPayload(payload)
            await stream.write(formatter.patchElements(html, opts ?? {}))
            continue
          }

          if (isPatchSignalsEffect(fx)) {
            const [, signals, opts] = fx
            await stream.write(formatter.patchSignals(JSON.stringify(signals), opts ?? {}))
            continue
          }

          if (isExecuteScriptEffect(fx)) {
            const [, script, opts] = fx
            await stream.write(formatter.executeScript(script, opts))
            continue
          }

          if (fx[0] === 'close-sse') {
            await stream.close()
            return
          }
        }
      }

      const getQueries = () => {
        if (c.var.queries) return c.var.queries
        const registry = new TopicQueryRegistry()
        c.set('queries', registry)
        return registry
      }

      const runQuery = async (topic: string, event?: DomainEvent) => {
        const queries = getQueries()
        const effects = await queries.run({ c, topic, ...(event ? { event } : {}) })
        if (!effects || effects.length === 0) return
        await writeEffectsToStream(effects)
      }

      await stream.writeSSE({ data: '', event: 'connection-established', id: clientId })
      const ping = setInterval(() => {
        enqueue(() => stream.writeSSE({ event: 'ping', data: '' }))
      }, pingMs)

      const handleMessage = (msg: SSEPayload) => {
        if (msg.event === 'datastar-patch-elements') {
          const eventString = formatter.patchElements(msg.html, msg.options)
          enqueue(() => stream.write(eventString))
        } else if (msg.event === 'datastar-patch-signals') {
          const eventString = formatter.patchSignals(msg.signals, msg.options)
          enqueue(() => stream.write(eventString))
        } else if (msg.event === 'execute-script') {
          const eventString = formatter.executeScript(msg.script, msg.options)
          enqueue(() => stream.write(eventString))
        } else if (msg.event === 'close') {
          try {
            unsubscribes.forEach(u => u?.())
            clearInterval(ping)
          } finally {
            enqueue(() => stream.close())
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
            let hasLiveMessage = false
            const sink = (msg: SSEPayload) => {
              hasLiveMessage = true
              if (msg.event === 'honostar-event') {
                const event: DomainEvent = {
                  name: msg.name,
                  payload: safeParseJsonifiable(msg.payload),
                }
                enqueue(() => runQuery(topic, event))
                return
              }
              handleMessage(msg)
            }
            unsubscribes.push(bus.subscribeTopic(topic, sink))

            // Option C (recommended): send a fat patch immediately on connect when a query is registered.
            // Fallback to retained topic patches when using the legacy "broadcast patches" flow.
            if (getQueries().has(topic)) {
              enqueue(() => runQuery(topic))
              continue
            }

            // Immediately self-heal by replaying the last retained fat patch for this topic.
            // This prevents stale state after reconnects (sleep/offline/background) even when no new
            // mutations occur after the client reconnects.
            try {
              const retained = await bus.getRetainedTopic?.(topic)
              if (retained && !hasLiveMessage) {
                handleMessage(retained)
              }
            } catch (err) {
              console.error(`[SSE] Failed to replay retained topic patch for "${topic}"`, err)
            }
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
