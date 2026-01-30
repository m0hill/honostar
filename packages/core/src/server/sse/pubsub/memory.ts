import type {
  ExecuteScriptOptions,
  PatchElementsOptions,
  PatchSignalsOptions,
} from "../../../common/types"

export type SseLane = "canonical" | "interaction" | "bulk"

export type SseQos = {
  /**
   * Priority lane for scheduling writes on a single SSE connection.
   * canonical > interaction > bulk
   */
  lane?: SseLane
  /**
   * Optional key used for coalescing/dropping within a lane.
   */
  key?: string
  /**
   * When true, newer messages with the same `key` replace queued ones (bulk-friendly).
   */
  drop?: boolean
}

type SseEnvelope = { qos?: SseQos }

export type SSEPayload =
  | ({
      event: "datastar-patch-elements"
      html: string
      options: PatchElementsOptions
    } & SseEnvelope)
  | ({
      event: "datastar-patch-signals"
      signals: string
      options: PatchSignalsOptions
    } & SseEnvelope)
  | ({ event: "execute-script"; script: string; options?: ExecuteScriptOptions } & SseEnvelope)
  | ({ event: "honostar-event"; name: string; payload: string } & SseEnvelope)
  | ({
      event: "datastar-honostar-stream-open"
      streamId: string
      meta?: string
    } & SseEnvelope)
  | ({
      event: "datastar-honostar-stream-chunk"
      streamId: string
      kind: "text" | "json"
      data: string
      target?: string
    } & SseEnvelope)
  | ({ event: "datastar-honostar-stream-close"; streamId: string } & SseEnvelope)
  | ({ event: "datastar-honostar-stream-error"; streamId: string; message: string } & SseEnvelope)
  | ({ event: "close" } & SseEnvelope)

export type Sink = (msg: SSEPayload) => void

export interface PubSubBus {
  subscribeClient(clientId: string, sink: Sink): () => void
  subscribeTopic(topic: string, sink: Sink): () => void
  toClient(clientId: string, msg: SSEPayload): void
  toTopic(topic: string, msg: SSEPayload): void
  toAll(msg: SSEPayload): void
  /**
   * Returns an AbortSignal that is aborted when the client SSE connection closes (when supported).
   * This is intended for long-running tab-scoped streams.
   */
  getClientAbortSignal?: (clientId: string) => AbortSignal | null
  /**
   * Register a per-stream abort controller for a client tab.
   * Implementations MAY abort/replace any existing controller for the same (clientId, streamId).
   */
  registerClientStreamAbort?: (
    clientId: string,
    streamId: string,
    controller: AbortController
  ) => void
  /**
   * Unregister a per-stream abort controller without aborting.
   */
  unregisterClientStreamAbort?: (clientId: string, streamId: string) => void
  /**
   * Abort a running client stream by ID, when supported.
   */
  abortClientStream?: (clientId: string, streamId: string, reason?: string) => void
  /**
   * Return a retained "last known good" patch for a topic.
   * Used by the SSE endpoint to immediately self-heal state on (re)connect.
   *
   * Implementations SHOULD only retain idempotent "fat patches" (e.g. patch-elements outer/inner/replace),
   * and MUST NOT retain side-effectful events like execute-script.
   */
  getRetainedTopic?: (topic: string) => Promise<SSEPayload | null>
}

class Channel {
  public subs = new Set<Sink>()
  subscribe(fn: Sink) {
    this.subs.add(fn)
    return () => this.subs.delete(fn)
  }
  publish(msg: SSEPayload) {
    for (const s of this.subs) {
      try {
        s(msg)
      } catch (e) {
        console.error("SSE sink error:", e)
      }
    }
  }
}

function canRetain(
  msg: SSEPayload
): msg is Extract<SSEPayload, { event: "datastar-patch-elements" }> {
  if (msg.event !== "datastar-patch-elements") return false
  const mode = msg.options?.mode ?? "outer"
  // Only retain idempotent modes; append/prepend/before/after are order-dependent.
  return mode === "outer" || mode === "inner" || mode === "replace"
}

export class MemoryBus implements PubSubBus {
  private clients = new Map<string, Channel>()
  private topics = new Map<string, Channel>()
  private clientAborts = new Map<string, AbortController>()
  private clientStreamAborts = new Map<string, AbortController>()
  private retainedTopics = new Map<
    string,
    Extract<SSEPayload, { event: "datastar-patch-elements" }>
  >()
  private retainedOrder: string[] = []
  private maxRetainedTopics = 1000

  private getClientChannel(clientId: string) {
    let c = this.clients.get(clientId)
    if (!c) {
      c = new Channel()
      this.clients.set(clientId, c)
    }
    return c
  }

  private getTopicChannel(topic: string) {
    let c = this.topics.get(topic)
    if (!c) {
      c = new Channel()
      this.topics.set(topic, c)
    }
    return c
  }

  subscribeClient(clientId: string, sink: Sink) {
    const ch = this.getClientChannel(clientId)
    if (!this.clientAborts.has(clientId)) {
      this.clientAborts.set(clientId, new AbortController())
    }
    const unsub = ch.subscribe(sink)
    return () => {
      try {
        unsub()
      } finally {
        if (ch.subs.size === 0) {
          this.clients.delete(clientId)
          const ac = this.clientAborts.get(clientId)
          if (ac) {
            try {
              ac.abort()
            } finally {
              this.clientAborts.delete(clientId)
            }
          }

          // Abort and clear any per-stream controllers for this client.
          const prefix = `${clientId}::`
          for (const [key, controller] of this.clientStreamAborts.entries()) {
            if (!key.startsWith(prefix)) continue
            try {
              controller.abort()
            } finally {
              this.clientStreamAborts.delete(key)
            }
          }
        }
      }
    }
  }

  subscribeTopic(topic: string, sink: Sink) {
    const ch = this.getTopicChannel(topic)
    const unsub = ch.subscribe(sink)
    return () => {
      try {
        unsub()
      } finally {
        if (ch.subs.size === 0) {
          this.topics.delete(topic)
        }
      }
    }
  }

  toClient(clientId: string, msg: SSEPayload) {
    const existing = this.clients.get(clientId)
    if (!existing) return
    existing.publish(msg)
  }

  toTopic(topic: string, msg: SSEPayload) {
    if (canRetain(msg)) {
      const existingIndex = this.retainedOrder.indexOf(topic)
      if (existingIndex !== -1) {
        this.retainedOrder.splice(existingIndex, 1)
      }
      this.retainedOrder.push(topic)
      this.retainedTopics.set(topic, msg)
      // Simple FIFO pruning to bound memory usage.
      while (this.retainedOrder.length > this.maxRetainedTopics) {
        const oldest = this.retainedOrder.shift()
        if (oldest) {
          this.retainedTopics.delete(oldest)
        }
      }
    }
    this.getTopicChannel(topic).publish(msg)
  }

  toAll(msg: SSEPayload) {
    for (const ch of this.clients.values()) ch.publish(msg)
    for (const ch of this.topics.values()) ch.publish(msg)
  }

  getClientAbortSignal(clientId: string): AbortSignal | null {
    return this.clientAborts.get(clientId)?.signal ?? null
  }

  registerClientStreamAbort(clientId: string, streamId: string, controller: AbortController): void {
    const key = `${clientId}::${streamId}`
    const existing = this.clientStreamAborts.get(key)
    if (existing) {
      try {
        existing.abort()
      } finally {
        this.clientStreamAborts.delete(key)
      }
    }
    this.clientStreamAborts.set(key, controller)
  }

  unregisterClientStreamAbort(clientId: string, streamId: string): void {
    const key = `${clientId}::${streamId}`
    this.clientStreamAborts.delete(key)
  }

  abortClientStream(clientId: string, streamId: string, reason?: string): void {
    const key = `${clientId}::${streamId}`
    const controller = this.clientStreamAborts.get(key)
    if (!controller) return
    try {
      controller.abort(reason)
    } finally {
      this.clientStreamAborts.delete(key)
    }
  }

  async getRetainedTopic(topic: string): Promise<SSEPayload | null> {
    return this.retainedTopics.get(topic) ?? null
  }
}
