import type { PubSubBus, Sink, SSEPayload } from "./memory"

export interface RedisClient {
  publish(...args: any[]): Promise<any>
  subscribe(...args: any[]): Promise<any>
  unsubscribe(...args: any[]): Promise<any>
  on(event: string, listener: (...args: any[]) => void): any
  duplicate?: () => RedisClient
  connect?: () => Promise<any>
  get?: (key: string) => Promise<string | null>
  set?: (...args: any[]) => Promise<any>
}

export type RedisBusOptions = {
  publisher: RedisClient
  subscriber?: RedisClient
  channelPrefix?: string
  /**
   * TTL (in seconds) for retained topic patches stored in Redis.
   * Default: 3600 (1 hour).
   */
  retainTtlSec?: number
}

function isSsePayload(value: unknown): value is SSEPayload {
  if (typeof value !== "object" || value === null) return false
  const event = (value as { event?: unknown }).event
  if (typeof event !== "string") return false
  switch (event) {
    case "datastar-patch-elements":
      return typeof (value as { html?: unknown }).html === "string"
    case "datastar-patch-signals":
      return typeof (value as { signals?: unknown }).signals === "string"
    case "execute-script": {
      const script = (value as { script?: unknown }).script
      return typeof script === "string"
    }
    case "honostar-event": {
      const name = (value as { name?: unknown }).name
      const payload = (value as { payload?: unknown }).payload
      return typeof name === "string" && typeof payload === "string"
    }
    case "datastar-honostar-stream-open": {
      const streamId = (value as { streamId?: unknown }).streamId
      const meta = (value as { meta?: unknown }).meta
      return typeof streamId === "string" && (meta === undefined || typeof meta === "string")
    }
    case "datastar-honostar-stream-chunk": {
      const streamId = (value as { streamId?: unknown }).streamId
      const kind = (value as { kind?: unknown }).kind
      const data = (value as { data?: unknown }).data
      const target = (value as { target?: unknown }).target
      return (
        typeof streamId === "string" &&
        (kind === "text" || kind === "json") &&
        typeof data === "string" &&
        (target === undefined || typeof target === "string")
      )
    }
    case "datastar-honostar-stream-close": {
      const streamId = (value as { streamId?: unknown }).streamId
      return typeof streamId === "string"
    }
    case "datastar-honostar-stream-error": {
      const streamId = (value as { streamId?: unknown }).streamId
      const message = (value as { message?: unknown }).message
      return typeof streamId === "string" && typeof message === "string"
    }
    case "close":
      return true
    default:
      return false
  }
}

function safeJsonParse(payload: string): SSEPayload | null {
  try {
    const parsed: unknown = JSON.parse(payload)
    if (!isSsePayload(parsed)) return null
    return parsed
  } catch (err) {
    console.error("[RedisBus] Failed to parse payload", err)
    return null
  }
}

export class RedisBus implements PubSubBus {
  private publisher: RedisClient
  private subscriber: RedisClient
  private channelPrefix: string
  private broadcastChannel: string
  private retainTtlSec: number
  private channelSinks = new Map<string, Set<Sink>>()
  private sinkRefCount = new Map<Sink, number>()
  private retainedTopicCache = new Map<string, SSEPayload>()

  constructor(options: RedisBusOptions) {
    this.publisher = options.publisher
    const subscriber = options.subscriber ?? options.publisher.duplicate?.()
    if (!subscriber) {
      throw new Error("RedisBus requires a dedicated subscriber connection.")
    }
    this.subscriber = subscriber
    this.channelPrefix = options.channelPrefix ?? "honostar:bus"
    this.broadcastChannel = this.channelName("broadcast", "all")
    this.retainTtlSec = options.retainTtlSec ?? 3600

    this.subscriber.on("message", (...args: unknown[]) => {
      const channel = typeof args[0] === "string" ? args[0] : null
      const payload = typeof args[1] === "string" ? args[1] : null
      if (channel && payload) {
        this.handleMessage(channel, payload)
      }
    })

    void this.subscriber.subscribe(this.broadcastChannel).catch((err) => {
      console.error("[RedisBus] Failed to subscribe to broadcast channel", err)
    })
  }

  subscribeClient(clientId: string, sink: Sink) {
    const channel = this.channelName("client", clientId)
    return this.registerSink(channel, sink)
  }

  subscribeTopic(topic: string, sink: Sink) {
    const channel = this.channelName("topic", topic)
    return this.registerSink(channel, sink)
  }

  toClient(clientId: string, msg: SSEPayload) {
    const channel = this.channelName("client", clientId)
    this.publish(channel, msg)
  }

  toTopic(topic: string, msg: SSEPayload) {
    const channel = this.channelName("topic", topic)
    this.maybeRetainTopic(topic, msg)
    this.publish(channel, msg)
  }

  toAll(msg: SSEPayload) {
    this.publish(this.broadcastChannel, msg)
  }

  private channelName(kind: "client" | "topic" | "broadcast", id: string) {
    return `${this.channelPrefix}:${kind}:${id}`
  }

  private retainKey(kind: "topic", id: string) {
    return `${this.channelPrefix}:retain:${kind}:${id}`
  }

  private canRetain(
    msg: SSEPayload
  ): msg is Extract<SSEPayload, { event: "datastar-patch-elements" }> {
    if (msg.event !== "datastar-patch-elements") return false
    const mode = msg.options?.mode ?? "outer"
    return mode === "outer" || mode === "inner" || mode === "replace"
  }

  private maybeRetainTopic(topic: string, msg: SSEPayload) {
    if (!this.canRetain(msg)) return

    // Best-effort in-process cache.
    this.retainedTopicCache.set(topic, msg)

    // Best-effort cross-instance retention in Redis, when supported by the client.
    const key = this.retainKey("topic", topic)
    const payload = JSON.stringify(msg)
    if (typeof this.publisher.set === "function") {
      // ioredis supports: set(key, value, 'EX', seconds)
      this.publisher
        .set(key, payload, "EX", this.retainTtlSec)
        .catch((err) => console.error(`[RedisBus] Failed to retain topic ${topic}`, err))
    }
  }

  private registerSink(channel: string, sink: Sink) {
    let sinks = this.channelSinks.get(channel)
    if (!sinks) {
      sinks = new Set()
      this.channelSinks.set(channel, sinks)
      void this.subscriber.subscribe(channel).catch((err) => {
        console.error(`[RedisBus] Failed to subscribe to channel ${channel}`, err)
      })
    }
    sinks.add(sink)
    this.incrementSinkRef(sink)
    return () => this.unregisterSink(channel, sink)
  }

  private unregisterSink(channel: string, sink: Sink) {
    const sinks = this.channelSinks.get(channel)
    if (!sinks) return
    sinks.delete(sink)
    this.decrementSinkRef(sink)
    if (sinks.size === 0) {
      this.channelSinks.delete(channel)
      if (channel !== this.broadcastChannel) {
        void this.subscriber.unsubscribe(channel).catch((err) => {
          console.error(`[RedisBus] Failed to unsubscribe from channel ${channel}`, err)
        })
      }
    }
  }

  private incrementSinkRef(sink: Sink) {
    const next = (this.sinkRefCount.get(sink) ?? 0) + 1
    this.sinkRefCount.set(sink, next)
  }

  private decrementSinkRef(sink: Sink) {
    const current = this.sinkRefCount.get(sink)
    if (!current) return
    if (current <= 1) {
      this.sinkRefCount.delete(sink)
    } else {
      this.sinkRefCount.set(sink, current - 1)
    }
  }

  private publish(channel: string, msg: SSEPayload) {
    const payload = JSON.stringify(msg)
    this.publisher.publish(channel, payload).catch((err) => {
      console.error(`[RedisBus] Failed to publish to channel ${channel}`, err)
    })
  }

  private handleMessage(channel: string, payload: string) {
    const parsed = safeJsonParse(payload)
    if (!parsed) return

    // Update in-process cache for retained topic patches.
    const topicPrefix = `${this.channelPrefix}:topic:`
    if (channel.startsWith(topicPrefix)) {
      const topic = channel.slice(topicPrefix.length)
      if (this.canRetain(parsed)) {
        this.retainedTopicCache.set(topic, parsed)
      }
    }

    if (channel === this.broadcastChannel) {
      this.emitToAll(parsed)
      return
    }

    const sinks = this.channelSinks.get(channel)
    if (!sinks || sinks.size === 0) return
    for (const sink of sinks) {
      try {
        sink(parsed)
      } catch (err) {
        console.error("[RedisBus] Sink handler failed", err)
      }
    }
  }

  private emitToAll(msg: SSEPayload) {
    for (const sink of this.sinkRefCount.keys()) {
      try {
        sink(msg)
      } catch (err) {
        console.error("[RedisBus] Sink handler failed", err)
      }
    }
  }

  async getRetainedTopic(topic: string): Promise<SSEPayload | null> {
    // Prefer Redis as the source of truth when available (cross-instance).
    const key = this.retainKey("topic", topic)
    if (typeof this.publisher.get === "function") {
      try {
        const payload = await this.publisher.get(key)
        if (!payload) return null
        return safeJsonParse(payload)
      } catch (err) {
        console.error(`[RedisBus] Failed to read retained topic ${topic}`, err)
      }
    }
    return this.retainedTopicCache.get(topic) ?? null
  }
}
