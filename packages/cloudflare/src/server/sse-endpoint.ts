import type { Context, Handler } from "hono"
import type { JSX } from "hono/jsx/jsx-runtime"
import type {
  ExecuteScriptOptions,
  Jsonifiable,
  PatchElementsOptions,
  PatchSignalsOptions,
} from "@honostar/core/common"
import type { EffectDefinition, HonostarConfig, SSEPayload } from "@honostar/core/server"
import {
  createConfig,
  resolveRegionPatchOptions,
  SseFormatter,
  TopicQueryRegistry,
  validateEventContract,
  verifyTopics,
} from "@honostar/core/server"
import type { AppEnv } from "@honostar/core/server"
import type { RegionPatch, RegionPatchSeq } from "@honostar/core/server"
import type { CloudflareSseEndpointOptions } from "./types"
import { isBusWireMessage } from "./wire"

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

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

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

  if (Array.isArray(value)) return value.every(isJsonifiable)
  if (isPlainRecord(value)) return Object.values(value).every(isJsonifiable)
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

function encodeUtf8(s: string): Uint8Array {
  return new TextEncoder().encode(s)
}

function sseLine(event: string, data: string): string {
  return `event: ${event}\ndata: ${data}\n\n`
}

type HubStub = { fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> }
type HubNamespace = { idFromName: (name: string) => unknown; get: (id: unknown) => unknown }

function isHubStub(value: unknown): value is HubStub {
  return isPlainRecord(value) && typeof value.fetch === "function"
}

function getHubNamespace(c: Context): HubNamespace | null {
  const env: unknown = c.env
  if (!isPlainRecord(env)) return null
  const hub: unknown = env.HONOSTAR_SSE_HUB
  if (!isPlainRecord(hub)) return null

  const idFromName = hub.idFromName
  const get = hub.get
  if (typeof idFromName !== "function" || typeof get !== "function") return null

  return {
    idFromName: (name: string) => idFromName.call(hub, name),
    get: (id: unknown) => get.call(hub, id),
  }
}

export function createCloudflareSseEndpoint(
  options: CloudflareSseEndpointOptions
): Handler<AppEnv> {
  const config: HonostarConfig = createConfig(options.config)
  const pingMs = config.sse?.pingIntervalMs ?? 25000

  return async (c: Context<AppEnv>) => {
    const clientId = c.var.clientId
    if (clientId === "anonymous") {
      return c.text("anonymous SSE not allowed", 401)
    }

    const topicsParam = c.req.query("topics")
    const requestedTopics = topicsParam
      ? topicsParam.split(",").filter((t: string) => t.trim())
      : []
    const allowedTopics =
      requestedTopics.length > 0 ? await verifyTopics(c, requestedTopics, config) : []

    const hubNs = getHubNamespace(c)
    if (!hubNs) {
      return c.text("missing HONOSTAR_SSE_HUB binding", 500)
    }
    const hubName = options.hubName ?? "shared"
    const hubStubRaw = hubNs.get(hubNs.idFromName(hubName))
    if (!isHubStub(hubStubRaw)) {
      return c.text("invalid HONOSTAR_SSE_HUB binding", 500)
    }
    const hubStub = hubStubRaw

    const connectUrl = new URL("https://honostar-sse-hub/connect")
    connectUrl.searchParams.set("clientId", clientId)
    for (const t of allowedTopics ?? []) connectUrl.searchParams.append("topic", t)

    const wsRes = await hubStub.fetch(connectUrl.toString(), {
      headers: {
        Upgrade: "websocket",
        Connection: "Upgrade",
      },
    })

    if (wsRes.status !== 101) return c.text("failed to connect hub", 502)

    const webSocket = wsRes.webSocket
    if (!webSocket) return c.text("failed to connect hub", 502)

    webSocket.accept()

    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
    const writer = writable.getWriter()

    let closed = false
    const closeAll = async () => {
      if (closed) return
      closed = true
      try {
        webSocket.close(1000, "closing")
      } catch {
        // ignore
      }
      try {
        await writer.close()
      } catch {
        // ignore
      }
    }

    let writeChain: Promise<void> = Promise.resolve()
    const send = async (s: string) => {
      if (closed) return
      const chunk = encodeUtf8(s)
      writeChain = writeChain.then(() => writer.write(chunk))
      try {
        await writeChain
      } catch {
        await closeAll()
      }
    }

    const ping = setInterval(() => {
      void send(sseLine("ping", ""))
    }, pingMs)

    const formatter = new SseFormatter()

    const renderNode = async (node: JSX.Element | string | null | undefined): Promise<string> => {
      if (node === null || node === undefined) return ""
      if (typeof node === "string") return node
      return await c.var.renderFragmentToString(node)
    }

    const renderElementsPayload = async (
      payload: JSX.Element | JSX.Element[] | string
    ): Promise<string> => {
      if (Array.isArray(payload)) {
        const html = await Promise.all(payload.map((p) => renderNode(p)))
        return html.join("\n")
      }
      return await renderNode(payload)
    }

    const renderElementsSeqPayload = async (
      payload: Array<JSX.Element | string>
    ): Promise<string> => {
      const html = await Promise.all(payload.map((p) => renderNode(p)))
      return html.join("\n")
    }

    const writeEffects = async (effects: EffectDefinition[]) => {
      for (const fx of effects) {
        if (isPatchElementsEffect(fx)) {
          const [, payload, opts] = fx
          const html = await renderElementsPayload(payload)
          await send(formatter.patchElements(html, opts ?? {}))
          continue
        }
        if (isPatchElementsSeqEffect(fx)) {
          const [, payload, opts] = fx
          const html = await renderElementsSeqPayload(payload)
          await send(formatter.patchElements(html, opts ?? {}))
          continue
        }
        if (isPatchRegionEffect(fx)) {
          const [, patch] = fx
          const html = await renderElementsPayload(patch.html)
          const opts = resolveRegionPatchOptions(patch, c.var.regionRegistry)
          await send(formatter.patchElements(html, opts))
          continue
        }
        if (isPatchRegionSeqEffect(fx)) {
          const [, patch] = fx
          const html = await renderElementsSeqPayload(patch.html)
          const opts = resolveRegionPatchOptions(patch, c.var.regionRegistry)
          await send(formatter.patchElements(html, opts))
          continue
        }
        if (isPatchSignalsEffect(fx)) {
          const [, signals, opts] = fx
          await send(formatter.patchSignals(JSON.stringify(signals), opts ?? {}))
          continue
        }
        if (isExecuteScriptEffect(fx)) {
          const [, script, opts] = fx
          await send(formatter.executeScript(script, opts))
          continue
        }
        if (fx[0] === "close-sse") {
          await closeAll()
          return
        }
      }
    }

    const queries = new TopicQueryRegistry()
    if (options.queries && options.queries.length > 0) {
      for (const [topicOrPattern, handler] of options.queries) {
        if (typeof topicOrPattern === "string") queries.register(topicOrPattern, handler)
        else queries.register(topicOrPattern, handler)
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
      const fx = await queries.run({ c, topic, ...(event ? { event } : {}) })
      if (fx && fx.length > 0) {
        await writeEffects(fx)
      }
    }

    const topicsForConnect = allowedTopics ?? []
    const bootstrap = async () => {
      // IMPORTANT: don't block returning the Response on an initial write.
      // In workerd, writing to a TransformStream before the Response is returned can deadlock.
      await send(`event: connection-established\nid: ${clientId}\ndata: \n\n`)

      for (const topic of topicsForConnect) {
        if (queries.has(topic)) {
          await runQuery(topic)
          continue
        }
        const retained = await c.var.bus.getRetainedTopic?.(topic)
        if (retained && retained.event === "datastar-patch-elements") {
          await send(formatter.patchElements(retained.html, retained.options))
        }
      }
    }
    void bootstrap().catch(async (err: unknown) => {
      console.error("[CloudflareSSE] bootstrap failed", err)
      await closeAll()
    })

    webSocket.addEventListener("message", (evt: MessageEvent) => {
      const handle = async () => {
        const data: unknown = evt.data
        const text =
          typeof data === "string"
            ? data
            : data instanceof ArrayBuffer
              ? new TextDecoder().decode(data)
              : null
        if (text === null) return
        const parsed = (() => {
          try {
            const value: unknown = JSON.parse(text)
            return value
          } catch {
            return null
          }
        })()
        if (!isBusWireMessage(parsed)) return

        if (parsed.to === "topic") {
          const msg = parsed.msg
          if (msg.event === "honostar-event") {
            const event: DomainEvent = {
              name: msg.name,
              payload: safeParseJsonifiable(msg.payload),
            }
            await runQuery(parsed.topic, event)
            return
          }
          await writeSsePayload(formatter, msg, send, closeAll)
          return
        }

        await writeSsePayload(formatter, parsed.msg, send, closeAll)
      }
      void handle().catch((err: unknown) =>
        console.error("[CloudflareSSE] message handler failed", err)
      )
    })

    const stop = () => {
      clearInterval(ping)
      void closeAll()
    }
    webSocket.addEventListener("close", stop)
    webSocket.addEventListener("error", stop)

    return new Response(readable, {
      headers: {
        Connection: "keep-alive",
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    })
  }
}

async function writeSsePayload(
  formatter: SseFormatter,
  msg: SSEPayload,
  send: (s: string) => Promise<void>,
  closeAll: () => Promise<void>
) {
  if (msg.event === "datastar-patch-elements") {
    await send(formatter.patchElements(msg.html, msg.options))
    return
  }
  if (msg.event === "datastar-patch-signals") {
    await send(formatter.patchSignals(msg.signals, msg.options))
    return
  }
  if (msg.event === "execute-script") {
    await send(formatter.executeScript(msg.script, msg.options))
    return
  }
  if (msg.event === "datastar-honostar-stream-open") {
    await send(formatter.streamOpen(msg.streamId, msg.meta))
    return
  }
  if (msg.event === "datastar-honostar-stream-chunk") {
    await send(
      formatter.streamChunk({
        streamId: msg.streamId,
        kind: msg.kind,
        data: msg.data,
        ...(msg.target !== undefined ? { target: msg.target } : {}),
      })
    )
    return
  }
  if (msg.event === "datastar-honostar-stream-close") {
    await send(formatter.streamClose(msg.streamId))
    return
  }
  if (msg.event === "datastar-honostar-stream-error") {
    await send(formatter.streamError(msg.streamId, msg.message))
    return
  }
  if (msg.event === "close") {
    await closeAll()
  }
}
