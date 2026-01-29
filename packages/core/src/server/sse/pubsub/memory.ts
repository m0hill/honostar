import type {
  ExecuteScriptOptions,
  PatchElementsOptions,
  PatchSignalsOptions,
} from "../../../common/types"

export type SSEPayload =
  | { event: "datastar-patch-elements"; html: string; options: PatchElementsOptions }
  | { event: "datastar-patch-signals"; signals: string; options: PatchSignalsOptions }
  | { event: "execute-script"; script: string; options?: ExecuteScriptOptions }
  | { event: "honostar-event"; name: string; payload: string }
  | { event: "close" }

export type Sink = (msg: SSEPayload) => void

export interface PubSubBus {
  subscribeClient(clientId: string, sink: Sink): () => void
  subscribeTopic(topic: string, sink: Sink): () => void
  toClient(clientId: string, msg: SSEPayload): void
  toTopic(topic: string, msg: SSEPayload): void
  toAll(msg: SSEPayload): void
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
    const unsub = ch.subscribe(sink)
    return () => {
      try {
        unsub()
      } finally {
        if (ch.subs.size === 0) {
          this.clients.delete(clientId)
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
    this.getClientChannel(clientId).publish(msg)
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

  async getRetainedTopic(topic: string): Promise<SSEPayload | null> {
    return this.retainedTopics.get(topic) ?? null
  }
}
