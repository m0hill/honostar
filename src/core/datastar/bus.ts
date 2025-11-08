import type {
  ExecuteScriptOptions,
  PatchElementsOptions,
  PatchSignalsOptions,
} from '@/core/datastar/types'

export type SSEPayload =
  | { event: 'datastar-patch-elements'; html: string; options: PatchElementsOptions }
  | { event: 'datastar-patch-signals'; signals: string; options: PatchSignalsOptions }
  | { event: 'execute-script'; script: string; options?: ExecuteScriptOptions }
  | { event: 'close' }

export type Sink = (msg: SSEPayload) => void

export interface PubSubBus {
  subscribeClient(clientId: string, sink: Sink): () => void
  subscribeTopic(topic: string, sink: Sink): () => void
  toClient(clientId: string, msg: SSEPayload): void
  toTopic(topic: string, msg: SSEPayload): void
  toAll(msg: SSEPayload): void
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
        console.error('SSE sink error:', e)
      }
    }
  }
}

export class MemoryBus implements PubSubBus {
  private clients = new Map<string, Channel>()
  private topics = new Map<string, Channel>()

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
    this.getTopicChannel(topic).publish(msg)
  }

  toAll(msg: SSEPayload) {
    for (const ch of this.clients.values()) ch.publish(msg)
    for (const ch of this.topics.values()) ch.publish(msg)
  }
}

export const memoryBus = new MemoryBus()
