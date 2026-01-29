/**
 * SSE Endpoint
 *
 * Exposes a single long-lived Server-Sent Events (SSE) connection per tab (clientId).
 *
 * Connection lifecycle:
 * - Always subscribes the client to its own `clientId` channel (tab-scoped replies).
 * - Optionally verifies `topics` subscriptions using a signed allowlist (`topicsToken` or cookie).
 * - Replays retained "idempotent" topic patches immediately on connect (self-healing UI).
 * - Runs CQRS query handlers on connect (initial render) and again on `honostar-event`.
 * - Sends periodic heartbeats (`ping`) to keep intermediaries from closing the stream.
 *
 * Architecture Notes:
 * - Topic verification is required in production. In development, missing secrets allow all topics.
 * - We serialize writes through a promise chain to keep SSE event ordering deterministic.
 */
import type { Handler } from "hono"
import type { JSX } from "hono/jsx/jsx-runtime"
import { streamSSE } from "hono/streaming"
import type {
  ExecuteScriptOptions,
  Jsonifiable,
  PatchElementsOptions,
  PatchSignalsOptions,
} from "../../common/types"
import type { HonostarConfig } from "../config"
import { createConfig } from "../config"
import type { RegionPatch, RegionPatchSeq } from "../regions"
import { resolveRegionPatchOptions } from "../regions"
import { validateEventContract } from "../contracts"
import { verifyTopics } from "../security/topics"
import type { EffectDefinition } from "./effect-registry"
import { SseFormatter } from "./generator"
import type { SSEPayload } from "./pubsub/memory"
import type { QueryRegistration } from "./queries"
import { TopicQueryRegistry } from "./queries"

type DomainEvent = { name: string; payload: Jsonifiable | null }

const isPatchElementsEffect = (
  fx: EffectDefinition
): fx is ["patch-elements", JSX.Element | JSX.Element[] | string, PatchElementsOptions?] =>
  fx[0] === "patch-elements"

const isPatchElementsSeqEffect = (
  fx: EffectDefinition
): fx is ["patch-elements-seq", Array<JSX.Element | string>, PatchElementsOptions?] =>
  fx[0] === "patch-elements-seq"

const isPatchRegionEffect = (fx: EffectDefinition): fx is ["patch-region", RegionPatch] =>
  fx[0] === "patch-region"

const isPatchRegionSeqEffect = (fx: EffectDefinition): fx is ["patch-region-seq", RegionPatchSeq] =>
  fx[0] === "patch-region-seq"

const isPatchSignalsEffect = (
  fx: EffectDefinition
): fx is ["patch-signals", Record<string, Jsonifiable>, PatchSignalsOptions?] =>
  fx[0] === "patch-signals"

const isExecuteScriptEffect = (
  fx: EffectDefinition
): fx is ["execute-script", string, ExecuteScriptOptions?] => fx[0] === "execute-script"

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

function isJsonifiable(value: unknown): value is Jsonifiable {
  if (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
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
 * Creates an SSE endpoint handler.
 *
 * The returned handler is usually mounted at `config.endpoints.sse` (default `/_/events`).
 *
 * @param userConfig - Partial config merged with defaults (security policies, ping interval, etc).
 * @param options - Optional CQRS wiring for query registrations (for small apps / simple setup).
 *
 * @example
 * ```ts
 * app.get("/_/events", createSseEndpoint(config))
 * ```
 */
export const createSseEndpoint = (
  userConfig?: Partial<HonostarConfig>,
  options?: { queries?: QueryRegistration[] }
): Handler => {
  const config = createConfig(userConfig)
  const pingMs = config.sse?.pingIntervalMs ?? 25000
  return (c) =>
    streamSSE(c, async (stream) => {
      const clientId = c.var.clientId
      const bus = c.var.bus
      if (clientId === "anonymous") {
        console.error("[SSE] Anonymous client connection rejected.")
        await stream.close()
        return
      }
      const unsubscribes: (() => void)[] = []
      const formatter = new SseFormatter()
      let writeChain: Promise<unknown> = Promise.resolve()

      const enqueue = (fn: () => Promise<unknown>) => {
        writeChain = writeChain.then(fn).catch((err) => {
          console.error("[SSE] Write chain error", err)
        })
      }

      const renderNode = async (node: JSX.Element | string | null | undefined): Promise<string> => {
        if (node === null || node === undefined) return ""
        if (typeof node === "string") return node
        return await c.var.renderFragmentToString(node)
      }

      const renderElementsPayload = async (
        payload: JSX.Element | JSX.Element[] | string
      ): Promise<string> => {
        if (Array.isArray(payload)) {
          const html = await Promise.all(payload.map((part) => renderNode(part)))
          return html.join("\n")
        }
        return await renderNode(payload)
      }

      const renderElementsSeqPayload = async (
        payload: Array<JSX.Element | string>
      ): Promise<string> => {
        const html = await Promise.all(payload.map((part) => renderNode(part)))
        return html.join("\n")
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

          if (isPatchRegionEffect(fx)) {
            const [, patch] = fx
            const html = await renderElementsPayload(patch.html)
            const opts = resolveRegionPatchOptions(patch, c.var.regionRegistry)
            await stream.write(formatter.patchElements(html, opts))
            continue
          }

          if (isPatchRegionSeqEffect(fx)) {
            const [, patch] = fx
            const html = await renderElementsSeqPayload(patch.html)
            const opts = resolveRegionPatchOptions(patch, c.var.regionRegistry)
            await stream.write(formatter.patchElements(html, opts))
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

          if (fx[0] === "close-sse") {
            await stream.close()
            return
          }
        }
      }

      const getQueries = () => {
        if (c.var.queries) return c.var.queries
        const registry = new TopicQueryRegistry()
        c.set("queries", registry)
        return registry
      }

      // Allow wiring CQRS queries directly through the SSE endpoint factory so apps don't
      // need separate `registerQueries(...)` middleware.
      if (options?.queries && options.queries.length > 0) {
        const registry = getQueries()
        for (const [topicOrPattern, handler] of options.queries) {
          // Narrow for overload resolution (string vs RegExp).
          if (typeof topicOrPattern === "string") registry.register(topicOrPattern, handler)
          else registry.register(topicOrPattern, handler)
        }
      }

      const runQuery = async (topic: string, event?: DomainEvent) => {
        if (event) {
          await validateEventContract({
            topic,
            event: event.name,
            payload: event.payload ?? null,
            source: "receive",
          })
        }
        const queries = getQueries()
        const effects = await queries.run({ c, topic, ...(event ? { event } : {}) })
        if (!effects || effects.length === 0) return
        await writeEffectsToStream(effects)
      }

      await stream.writeSSE({ data: "", event: "connection-established", id: clientId })
      const ping = setInterval(() => {
        enqueue(() => stream.writeSSE({ event: "ping", data: "" }))
      }, pingMs)

      const handleMessage = (msg: SSEPayload) => {
        if (msg.event === "datastar-patch-elements") {
          const eventString = formatter.patchElements(msg.html, msg.options)
          enqueue(() => stream.write(eventString))
        } else if (msg.event === "datastar-patch-signals") {
          const eventString = formatter.patchSignals(msg.signals, msg.options)
          enqueue(() => stream.write(eventString))
        } else if (msg.event === "execute-script") {
          const eventString = formatter.executeScript(msg.script, msg.options)
          enqueue(() => stream.write(eventString))
        } else if (msg.event === "close") {
          try {
            unsubscribes.forEach((u) => u?.())
            clearInterval(ping)
          } finally {
            enqueue(() => stream.close())
          }
        }
      }

      // Always subscribe to client-specific messages
      unsubscribes.push(bus.subscribeClient(clientId, handleMessage))

      // Verify and enforce topic allowlist
      const topicsParam = c.req.query("topics")
      const requestedTopics = topicsParam ? topicsParam.split(",").filter((t) => t.trim()) : []

      if (requestedTopics.length > 0) {
        const allowedTopics = await verifyTopics(c, requestedTopics, config)

        if (allowedTopics && allowedTopics.length > 0) {
          // Subscribe only to allowed topics
          for (const topic of allowedTopics) {
            let hasLiveMessage = false
            const sink = (msg: SSEPayload) => {
              hasLiveMessage = true
              if (msg.event === "honostar-event") {
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
        } else if (allowedTopics && allowedTopics.length === 0) {
          console.warn(
            `[SSE] No requested topics were authorized for client ${clientId}. ` +
              "Only client-specific messages will be delivered."
          )
        } else {
          // Verification failed - log warning and skip topic subscriptions
          console.warn(
            `[SSE] Topic verification failed for client ${clientId}. ` +
              "Only client-specific messages will be delivered. " +
              "Requested topics were not authorized."
          )
        }
      }

      stream.onAbort(() => {
        console.log(`[SSE] Abort stream for client ${clientId}`)
        unsubscribes.forEach((unsub) => unsub?.())
        clearInterval(ping)
      })

      await new Promise(() => {})
    })
}
