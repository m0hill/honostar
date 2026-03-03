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
import type { SSEPayload, SseLane } from "./pubsub/memory"
import { sharedQueryCoalescer } from "./shared-query"
import type { QueryOptions, QueryRegistration } from "./queries"
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

const RESERVED_SSE_PARAM_KEYS = new Set(["topics", "topicsToken", "datastar"])

function stableJsonStringify(value: unknown): string {
  if (value === null || value === undefined) return "null"
  if (typeof value === "number" || typeof value === "boolean") return JSON.stringify(value)
  if (typeof value === "string") return JSON.stringify(value)

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJsonStringify(item)).join(",")}]`
  }

  if (isPlainRecord(value)) {
    const keys = Object.keys(value).sort()
    const parts = keys.map((key) => `${JSON.stringify(key)}:${stableJsonStringify(value[key])}`)
    return `{${parts.join(",")}}`
  }

  return JSON.stringify(null)
}

function extractSharedSseParams(url: string): Record<string, string> {
  const params = new URL(url, "http://localhost").searchParams
  const out: Record<string, string> = {}
  for (const [key, value] of params.entries()) {
    if (RESERVED_SSE_PARAM_KEYS.has(key)) continue
    if (out[key] !== undefined) continue
    out[key] = value
  }
  return out
}

function defaultSharedKey(args: {
  topic: string
  event: DomainEvent | undefined
  match: RegExpMatchArray | undefined
  sseParams: Record<string, string>
}): string {
  const eventName = args.event?.name ?? "__init__"
  const payload = stableJsonStringify(args.event?.payload ?? null)
  const match0 = args.match?.[0] ?? ""
  const sseParams = stableJsonStringify(args.sseParams)
  return `${args.topic}|${eventName}|${payload}|${match0}|${sseParams}`
}

function containsCloseSseEffect(effects: EffectDefinition[]): boolean {
  return effects.some((fx) => fx[0] === "close-sse")
}

type ResolvedQuery = NonNullable<ReturnType<TopicQueryRegistry["resolve"]>>

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
  return (c) => {
    const isProbeRequest =
      c.req.query("__honostar_probe") === "1" || c.req.header("x-honostar-probe") === "1"
    if (isProbeRequest) {
      return c.body(null, 204, { "x-honostar-sse": "ok" })
    }

    return streamSSE(c, async (stream) => {
      const clientId = c.var.clientId
      const bus = c.var.bus
      if (clientId === "anonymous") {
        console.error("[SSE] Anonymous client connection rejected.")
        await stream.close()
        return
      }
      const unsubscribes: (() => void)[] = []
      const formatter = new SseFormatter()
      let taskChain: Promise<unknown> = Promise.resolve()

      const enqueueTask = (fn: () => Promise<unknown>) => {
        taskChain = taskChain.then(fn).catch((err) => {
          console.error("[SSE] Task chain error", err)
        })
      }

      type QueuedWrite = {
        lane: SseLane
        qosKey?: string
        qosDrop?: boolean
        size: number
        write: () => Promise<unknown>
      }

      const queues: Record<SseLane, QueuedWrite[]> = {
        canonical: [],
        interaction: [],
        bulk: [],
      }
      const queuedBytes: Record<SseLane, number> = { canonical: 0, interaction: 0, bulk: 0 }

      // Keep a hard bound on buffered bulk data so a stream can't OOM the server.
      const MAX_BULK_BUFFERED_BYTES = 512 * 1024

      let flushScheduled = false
      let flushing = false

      const scheduleFlush = () => {
        if (flushScheduled) return
        flushScheduled = true
        queueMicrotask(() => {
          flushScheduled = false
          void flush()
        })
      }

      const pickNext = (): QueuedWrite | null => {
        return queues.canonical.shift() ?? queues.interaction.shift() ?? queues.bulk.shift() ?? null
      }

      const flush = async () => {
        if (flushing) return
        flushing = true
        try {
          let count = 0
          for (;;) {
            const next = pickNext()
            if (!next) break
            queuedBytes[next.lane] = Math.max(0, queuedBytes[next.lane] - next.size)
            await next.write()
            count++
            if (count >= 200) {
              scheduleFlush()
              break
            }
          }
        } catch (err) {
          console.error("[SSE] Flush error", err)
        } finally {
          flushing = false
        }
      }

      const enqueueWrite = (entry: QueuedWrite) => {
        if (entry.lane === "bulk") {
          // Drop/replace queued messages by key when configured (video-like streams).
          if (entry.qosDrop === true && entry.qosKey) {
            const idx = queues.bulk.findIndex((q) => q.qosKey === entry.qosKey)
            if (idx !== -1) {
              const prev = queues.bulk[idx]!
              queuedBytes.bulk = Math.max(0, queuedBytes.bulk - prev.size)
              queues.bulk[idx] = entry
              queuedBytes.bulk += entry.size
              scheduleFlush()
              return
            }
          }

          // Bound bulk buffering: best-effort drop oldest bulk messages.
          while (
            queuedBytes.bulk + entry.size > MAX_BULK_BUFFERED_BYTES &&
            queues.bulk.length > 0
          ) {
            const dropped = queues.bulk.shift()
            if (dropped) queuedBytes.bulk = Math.max(0, queuedBytes.bulk - dropped.size)
          }
          if (queuedBytes.bulk + entry.size > MAX_BULK_BUFFERED_BYTES) {
            return
          }
        }

        queues[entry.lane].push(entry)
        queuedBytes[entry.lane] += entry.size
        scheduleFlush()
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

      const compileEffects = async (effects: EffectDefinition[]): Promise<string[]> => {
        const compiled: string[] = []
        for (const fx of effects) {
          if (isPatchElementsEffect(fx)) {
            const [, payload, opts] = fx
            const html = await renderElementsPayload(payload)
            const eventString = formatter.patchElements(html, opts ?? {})
            compiled.push(eventString)
            continue
          }

          if (isPatchElementsSeqEffect(fx)) {
            const [, payload, opts] = fx
            const html = await renderElementsSeqPayload(payload)
            const eventString = formatter.patchElements(html, opts ?? {})
            compiled.push(eventString)
            continue
          }

          if (isPatchRegionEffect(fx)) {
            const [, patch] = fx
            const html = await renderElementsPayload(patch.html)
            const opts = resolveRegionPatchOptions(patch, c.var.regionRegistry)
            const eventString = formatter.patchElements(html, opts)
            compiled.push(eventString)
            continue
          }

          if (isPatchRegionSeqEffect(fx)) {
            const [, patch] = fx
            const html = await renderElementsSeqPayload(patch.html)
            const opts = resolveRegionPatchOptions(patch, c.var.regionRegistry)
            const eventString = formatter.patchElements(html, opts)
            compiled.push(eventString)
            continue
          }

          if (isPatchSignalsEffect(fx)) {
            const [, signals, opts] = fx
            const eventString = formatter.patchSignals(JSON.stringify(signals), opts ?? {})
            compiled.push(eventString)
            continue
          }

          if (isExecuteScriptEffect(fx)) {
            const [, script, opts] = fx
            const eventString = formatter.executeScript(script, opts)
            compiled.push(eventString)
          }
        }
        return compiled
      }

      const writeCompiled = async (compiledStrings: string[]) => {
        for (const eventString of compiledStrings) {
          enqueueWrite({
            lane: "canonical",
            size: eventString.length,
            write: () => stream.write(eventString),
          })
        }
      }

      const writeEffectsToStream = async (effects: EffectDefinition[]) => {
        const compiledStrings = await compileEffects(effects)
        await writeCompiled(compiledStrings)
        if (containsCloseSseEffect(effects)) {
          enqueueWrite({ lane: "canonical", size: 0, write: () => stream.close() })
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
        for (const [topicOrPattern, handler, queryOptions] of options.queries) {
          // Narrow for overload resolution (string vs RegExp).
          if (typeof topicOrPattern === "string") {
            registry.register(topicOrPattern, handler, queryOptions)
          } else {
            registry.register(topicOrPattern, handler, queryOptions)
          }
        }
      }

      const sharedSseParams = extractSharedSseParams(c.req.url)

      const invokeQuery = async (topic: string, resolved: ResolvedQuery, event?: DomainEvent) => {
        return await resolved.handler({
          c,
          topic,
          ...(event !== undefined ? { event } : {}),
          ...(resolved.match !== undefined ? { match: resolved.match } : {}),
        })
      }

      const buildSharedKey = (args: {
        topic: string
        event: DomainEvent | undefined
        resolved: ResolvedQuery
        queryOptions: QueryOptions
      }) => {
        const keyFn = args.queryOptions.key
        if (!keyFn) {
          return defaultSharedKey({
            topic: args.topic,
            event: args.event,
            match: args.resolved.match,
            sseParams: sharedSseParams,
          })
        }

        return keyFn({
          topic: args.topic,
          ...(args.event !== undefined ? { eventName: args.event.name } : {}),
          ...(args.event !== undefined ? { eventPayload: args.event.payload } : {}),
          match0: args.resolved.match?.[0] ?? "",
          sseParams: sharedSseParams,
        })
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
        const resolved = queries.resolve(topic)
        if (!resolved) return

        const queryOptions = resolved.options
        if (queryOptions?.shared === true) {
          const sharedCacheMs = queryOptions.cacheMs ?? 250
          const sharedKey = buildSharedKey({ topic, event, resolved, queryOptions })

          try {
            const compiledStrings = await sharedQueryCoalescer.getOrRun(
              sharedKey,
              sharedCacheMs,
              async () => {
                const effects = (await invokeQuery(topic, resolved, event)) ?? []
                if (containsCloseSseEffect(effects)) {
                  throw new Error("close-sse is not supported in shared query mode")
                }
                return await compileEffects(effects)
              }
            )
            await writeCompiled(compiledStrings)
            return
          } catch (error) {
            if (
              error instanceof Error &&
              error.message === "close-sse is not supported in shared query mode"
            ) {
              console.warn(
                `[CQRS] Query for topic "${topic}" returned close-sse while shared=true; falling back to per-connection execution.`
              )
            } else {
              throw error
            }
          }
        }

        const effects = await invokeQuery(topic, resolved, event)
        if (!effects || effects.length === 0) return
        await writeEffectsToStream(effects)
      }

      await stream.writeSSE({ data: "", event: "connection-established", id: clientId })
      const ping = setInterval(() => {
        enqueueWrite({
          lane: "interaction",
          size: 0,
          write: () => stream.writeSSE({ event: "ping", data: "" }),
        })
      }, pingMs)

      const handleMessage = (msg: SSEPayload) => {
        const lane: SseLane =
          msg.qos?.lane ??
          (msg.event === "honostar-event"
            ? "canonical"
            : msg.event === "close"
              ? "canonical"
              : "interaction")
        const qosKey =
          typeof msg.qos?.key === "string" && msg.qos.key.length > 0 ? msg.qos.key : undefined
        const qosDrop = msg.qos?.drop === true

        const enqueueEventString = (eventString: string) => {
          const entry: QueuedWrite = {
            lane,
            qosDrop,
            size: eventString.length,
            write: () => stream.write(eventString),
          }
          if (qosKey) entry.qosKey = qosKey
          enqueueWrite(entry)
        }

        if (msg.event === "datastar-patch-elements") {
          const eventString = formatter.patchElements(msg.html, msg.options)
          enqueueEventString(eventString)
        } else if (msg.event === "datastar-patch-signals") {
          const eventString = formatter.patchSignals(msg.signals, msg.options)
          enqueueEventString(eventString)
        } else if (msg.event === "execute-script") {
          const eventString = formatter.executeScript(msg.script, msg.options)
          enqueueEventString(eventString)
        } else if (msg.event === "datastar-honostar-stream-open") {
          const eventString = formatter.streamOpen(msg.streamId, msg.meta)
          enqueueEventString(eventString)
        } else if (msg.event === "datastar-honostar-stream-chunk") {
          const eventString = formatter.streamChunk({
            streamId: msg.streamId,
            kind: msg.kind,
            data: msg.data,
            ...(msg.target !== undefined && { target: msg.target }),
          })
          enqueueEventString(eventString)
        } else if (msg.event === "datastar-honostar-stream-close") {
          const eventString = formatter.streamClose(msg.streamId)
          enqueueEventString(eventString)
        } else if (msg.event === "datastar-honostar-stream-error") {
          const eventString = formatter.streamError(msg.streamId, msg.message)
          enqueueEventString(eventString)
        } else if (msg.event === "close") {
          try {
            unsubscribes.forEach((u) => u?.())
            clearInterval(ping)
          } finally {
            enqueueWrite({ lane: "canonical", size: 0, write: () => stream.close() })
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
                enqueueTask(() => runQuery(topic, event))
                return
              }
              handleMessage(msg)
            }
            unsubscribes.push(bus.subscribeTopic(topic, sink))

            // Option C (recommended): send a fat patch immediately on connect when a query is registered.
            // Fallback to retained topic patches when using the legacy "broadcast patches" flow.
            if (getQueries().has(topic)) {
              enqueueTask(() => runQuery(topic))
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
}
