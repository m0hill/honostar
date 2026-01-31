import type { PubSubBus, SSEPayload, Sink } from "@honostar/core/server"
import type { BusWireMessage } from "./wire"

export class CloudflareDurableObjectBus implements PubSubBus {
  private idFromName: (name: string) => unknown
  private get: (id: unknown) => unknown
  private hubName: string
  private waitUntil: ((promise: Promise<unknown>) => void) | undefined

  constructor(args: {
    hub: unknown
    hubName: string
    waitUntil?: ((promise: Promise<unknown>) => void) | undefined
  }) {
    const parsed = parseHubNamespace(args.hub)
    if (!parsed) {
      throw new Error("Invalid Durable Object namespace for hub")
    }
    this.idFromName = parsed.idFromName
    this.get = parsed.get
    this.hubName = args.hubName
    this.waitUntil = args.waitUntil
  }

  private stub(): HubFetchStub {
    const id = this.idFromName(this.hubName)
    const raw = this.get(id)
    const parsed = parseHubFetchStub(raw)
    if (!parsed) {
      throw new Error("Invalid hub stub")
    }
    return parsed
  }

  private async publish(wire: BusWireMessage): Promise<void> {
    const stub = this.stub()
    const res = await stub.fetch("https://honostar-sse-hub/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(wire),
    })
    if (!res.ok) {
      const msg = await res.text().catch(() => "")
      throw new Error(`hub publish failed: ${res.status} ${msg}`)
    }
  }

  private schedule(task: Promise<void>, label: string): void {
    const handled = task.catch((err: unknown) =>
      console.error(`[CloudflareBus] ${label} failed`, err)
    )
    if (this.waitUntil) {
      try {
        this.waitUntil(handled)
      } catch (err) {
        console.error("[CloudflareBus] waitUntil failed", err)
      }
      return
    }
    void handled
  }

  subscribeClient(_clientId: string, _sink: Sink): () => void {
    throw new Error(
      "CloudflareDurableObjectBus subscribeClient unsupported; use createCloudflareSseEndpoint"
    )
  }

  subscribeTopic(_topic: string, _sink: Sink): () => void {
    throw new Error(
      "CloudflareDurableObjectBus subscribeTopic unsupported; use createCloudflareSseEndpoint"
    )
  }

  toClient(clientId: string, msg: SSEPayload): void {
    try {
      this.schedule(this.publish({ to: "client", clientId, msg }), "publishClient")
    } catch (err) {
      console.error("[CloudflareBus] publishClient failed", err)
    }
  }

  toTopic(topic: string, msg: SSEPayload): void {
    try {
      this.schedule(this.publish({ to: "topic", topic, msg }), "publishTopic")
    } catch (err) {
      console.error("[CloudflareBus] publishTopic failed", err)
    }
  }

  toAll(msg: SSEPayload): void {
    try {
      this.schedule(this.publish({ to: "all", msg }), "publishAll")
    } catch (err) {
      console.error("[CloudflareBus] publishAll failed", err)
    }
  }

  async getRetainedTopic(topic: string): Promise<SSEPayload | null> {
    try {
      const stub = this.stub()
      const url = new URL("https://honostar-sse-hub/retained")
      url.searchParams.set("topic", topic)
      const res = await stub.fetch(url.toString())
      if (!res.ok) return null

      const parsed: unknown = await res.json().catch(() => null)
      return isSsePayload(parsed) ? parsed : null
    } catch (err) {
      console.error("[CloudflareBus] getRetainedTopic failed", err)
      return null
    }
  }
}

export function createCloudflareDurableObjectBus(args: {
  hub: unknown
  hubName?: string
  waitUntil?: ((promise: Promise<unknown>) => void) | undefined
}): CloudflareDurableObjectBus {
  return new CloudflareDurableObjectBus({
    hub: args.hub,
    hubName: args.hubName ?? "shared",
    waitUntil: args.waitUntil,
  })
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function parseHubNamespace(
  hub: unknown
): { idFromName: (name: string) => unknown; get: (id: unknown) => unknown } | null {
  if (!isPlainRecord(hub)) return null
  const idFromName = hub.idFromName
  const get = hub.get
  if (typeof idFromName !== "function" || typeof get !== "function") return null

  return {
    idFromName: (name: string) => idFromName.call(hub, name),
    get: (id: unknown) => get.call(hub, id),
  }
}

type HubFetchStub = {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
}

function parseHubFetchStub(value: unknown): HubFetchStub | null {
  if (!isPlainRecord(value)) return null
  const fetch = value.fetch
  if (typeof fetch !== "function") return null
  return {
    fetch: (input: RequestInfo | URL, init?: RequestInit) =>
      fetch.call(value, input, init) as Promise<Response>,
  }
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
