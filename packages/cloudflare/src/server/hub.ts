import { DurableObject } from "cloudflare:workers"
import type { SSEPayload } from "@honostar/core/server"
import type { BusWireMessage } from "./wire"
import { isBusWireMessage } from "./wire"

type Env = {
  // Intentionally empty; users can extend with their own bindings.
}

const ClientTagPrefix = "client:"
const TopicTagPrefix = "topic:"

function canRetain(
  msg: SSEPayload
): msg is Extract<SSEPayload, { event: "datastar-patch-elements" }> {
  if (msg.event !== "datastar-patch-elements") return false
  const mode = msg.options?.mode ?? "outer"
  return mode === "outer" || mode === "inner" || mode === "replace"
}

function retainKeyForTopic(topic: string): string {
  return `retained:topic:${topic}`
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isSsePayload(value: unknown): value is SSEPayload {
  if (!isPlainRecord(value)) return false
  const event = value.event
  if (typeof event !== "string") return false
  switch (event) {
    case "datastar-patch-elements":
      return typeof value.html === "string" && isPlainRecord(value.options)
    case "datastar-patch-signals":
      return typeof value.signals === "string" && isPlainRecord(value.options)
    case "execute-script":
      return typeof value.script === "string"
    case "honostar-event":
      return typeof value.name === "string" && typeof value.payload === "string"
    case "datastar-honostar-stream-open":
      return (
        typeof value.streamId === "string" &&
        (value.meta === undefined || typeof value.meta === "string")
      )
    case "datastar-honostar-stream-chunk":
      return (
        typeof value.streamId === "string" &&
        (value.kind === "text" || value.kind === "json") &&
        typeof value.data === "string" &&
        (value.target === undefined || typeof value.target === "string")
      )
    case "datastar-honostar-stream-close":
      return typeof value.streamId === "string"
    case "datastar-honostar-stream-error":
      return typeof value.streamId === "string" && typeof value.message === "string"
    case "close":
      return true
    default:
      return false
  }
}

export class CloudflareBusHub extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    const upgrade = request.headers.get("Upgrade")
    const url = new URL(request.url)

    if (upgrade === "websocket") {
      const clientId = url.searchParams.get("clientId") ?? "anonymous"
      const topics = url.searchParams.getAll("topic").filter((t: string) => t.trim().length > 0)

      // WebSocketPair ordering matters: [0] is the client end returned to the caller,
      // [1] is the server end accepted by the Durable Object.
      const pair = new WebSocketPair()
      const client = pair[0]
      const server = pair[1]
      if (!client || !server) {
        return new Response("Failed to create WebSocket pair", { status: 500 })
      }

      const tags = [`${ClientTagPrefix}${clientId}`, ...topics.map((t) => `${TopicTagPrefix}${t}`)]
      try {
        this.ctx.acceptWebSocket(server, tags)
      } catch (err) {
        console.error("[CloudflareBusHub] acceptWebSocket failed", err)
        return new Response("acceptWebSocket failed", { status: 500 })
      }
      return new Response(null, { status: 101, webSocket: client })
    }

    if (request.method === "POST" && url.pathname === "/publish") {
      const raw = await request.text()
      const parsed = safeJsonParse(raw)
      if (!isBusWireMessage(parsed)) {
        return new Response("Invalid payload", { status: 400 })
      }

      const wire = parsed
      if (wire.to === "client") {
        await this.publishClient(wire.clientId, wire.msg)
        return new Response("ok")
      }
      if (wire.to === "topic") {
        await this.publishTopic(wire.topic, wire.msg)
        return new Response("ok")
      }
      await this.publishAll(wire.msg)
      return new Response("ok")
    }

    if (request.method === "GET" && url.pathname === "/retained") {
      const topic = url.searchParams.get("topic")
      if (!topic || topic.trim().length === 0) {
        return new Response("Missing topic", { status: 400 })
      }
      const retained = await this.getRetainedTopic(topic)
      return new Response(JSON.stringify(retained), {
        headers: { "Content-Type": "application/json" },
      })
    }

    return new Response("Not found", { status: 404 })
  }

  private sendToSockets(filter: (tags: readonly string[]) => boolean, wire: BusWireMessage) {
    const payload = JSON.stringify(wire)
    for (const ws of this.ctx.getWebSockets()) {
      const tags = this.ctx.getTags(ws)
      if (!filter(tags)) continue
      try {
        ws.send(payload)
      } catch {
        try {
          ws.close(1011, "send failed")
        } catch {
          // ignore
        }
      }
    }
  }

  async publishClient(clientId: string, msg: SSEPayload): Promise<void> {
    this.sendToSockets((tags) => tags.includes(`${ClientTagPrefix}${clientId}`), {
      to: "client",
      clientId,
      msg,
    })
  }

  async publishTopic(topic: string, msg: SSEPayload): Promise<void> {
    if (canRetain(msg)) {
      await this.ctx.storage.put(retainKeyForTopic(topic), JSON.stringify(msg))
    }

    this.sendToSockets((tags) => tags.includes(`${TopicTagPrefix}${topic}`), {
      to: "topic",
      topic,
      msg,
    })
  }

  async publishAll(msg: SSEPayload): Promise<void> {
    this.sendToSockets(() => true, { to: "all", msg })
  }

  async getRetainedTopic(topic: string): Promise<SSEPayload | null> {
    const raw = await this.ctx.storage.get<string>(retainKeyForTopic(topic))
    if (!raw) return null
    const parsed = safeJsonParse(raw)
    if (!isSsePayload(parsed)) return null
    return parsed
  }
}
