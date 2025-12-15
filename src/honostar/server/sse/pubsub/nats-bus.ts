import type { PubSubBus, Sink, SSEPayload } from '@/honostar/server/sse/pubsub/memory'

export interface NatsConnection {
  subscribe(
    subject: string,
    opts?: { callback?: (err: Error | null, msg: NatsMsg) => void }
  ): NatsSubscription
  publish(subject: string, data?: Uint8Array): void
  close(): Promise<void>
}

export interface NatsMsg {
  data: Uint8Array
  subject: string
}

export interface NatsSubscription {
  unsubscribe(): void
  closed: Promise<void>
}

export type NatsBusOptions = {
  connection: NatsConnection
  subjectPrefix?: string
}

function isSsePayload(value: unknown): value is SSEPayload {
  if (typeof value !== 'object' || value === null) return false
  const event = (value as { event?: unknown }).event
  if (typeof event !== 'string') return false
  switch (event) {
    case 'datastar-patch-elements':
      return typeof (value as { html?: unknown }).html === 'string'
    case 'datastar-patch-signals':
      return typeof (value as { signals?: unknown }).signals === 'string'
    case 'execute-script': {
      const script = (value as { script?: unknown }).script
      return typeof script === 'string'
    }
    case 'honostar-event': {
      const name = (value as { name?: unknown }).name
      const payload = (value as { payload?: unknown }).payload
      return typeof name === 'string' && typeof payload === 'string'
    }
    case 'close':
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
    console.error('[NatsBus] Failed to parse payload', err)
    return null
  }
}

export class NatsBus implements PubSubBus {
  private connection: NatsConnection
  private subjectPrefix: string
  private broadcastSubject: string
  private subjectSinks = new Map<string, Set<Sink>>()
  private sinkRefCount = new Map<Sink, number>()
  private subscriptions = new Map<string, NatsSubscription>()
  private retainedTopics = new Map<
    string,
    Extract<SSEPayload, { event: 'datastar-patch-elements' }>
  >()

  constructor(options: NatsBusOptions) {
    this.connection = options.connection
    this.subjectPrefix = options.subjectPrefix ?? 'honostar.bus'
    this.broadcastSubject = this.subjectName('broadcast', 'all')

    // Subscribe to broadcast subject
    this.subscribeToBroadcast()
  }

  subscribeClient(clientId: string, sink: Sink) {
    const subject = this.subjectName('client', clientId)
    return this.registerSink(subject, sink)
  }

  subscribeTopic(topic: string, sink: Sink) {
    const subject = this.subjectName('topic', topic)
    return this.registerSink(subject, sink)
  }

  toClient(clientId: string, msg: SSEPayload) {
    const subject = this.subjectName('client', clientId)
    this.publish(subject, msg)
  }

  toTopic(topic: string, msg: SSEPayload) {
    const subject = this.subjectName('topic', topic)
    this.maybeRetainTopic(topic, msg)
    this.publish(subject, msg)
  }

  toAll(msg: SSEPayload) {
    this.publish(this.broadcastSubject, msg)
  }

  private subjectName(kind: 'client' | 'topic' | 'broadcast', id: string) {
    return `${this.subjectPrefix}.${kind}.${id}`
  }

  private canRetain(
    msg: SSEPayload
  ): msg is Extract<SSEPayload, { event: 'datastar-patch-elements' }> {
    if (msg.event !== 'datastar-patch-elements') return false
    const mode = msg.options?.mode ?? 'outer'
    return mode === 'outer' || mode === 'inner' || mode === 'replace'
  }

  private maybeRetainTopic(topic: string, msg: SSEPayload) {
    if (!this.canRetain(msg)) return
    this.retainedTopics.set(topic, msg)
  }

  private registerSink(subject: string, sink: Sink) {
    let sinks = this.subjectSinks.get(subject)
    if (!sinks) {
      sinks = new Set()
      this.subjectSinks.set(subject, sinks)
      this.subscribeToSubject(subject)
    }
    sinks.add(sink)
    this.incrementSinkRef(sink)
    return () => this.unregisterSink(subject, sink)
  }

  private unregisterSink(subject: string, sink: Sink) {
    const sinks = this.subjectSinks.get(subject)
    if (!sinks) return
    sinks.delete(sink)
    this.decrementSinkRef(sink)
    if (sinks.size === 0) {
      this.subjectSinks.delete(subject)
      if (subject !== this.broadcastSubject) {
        this.unsubscribeFromSubject(subject)
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

  private publish(subject: string, msg: SSEPayload) {
    try {
      const payload = JSON.stringify(msg)
      const encoder = new TextEncoder()
      this.connection.publish(subject, encoder.encode(payload))
    } catch (err) {
      console.error(`[NatsBus] Failed to publish to subject ${subject}`, err)
    }
  }

  private subscribeToSubject(subject: string) {
    try {
      const sub = this.connection.subscribe(subject, {
        callback: (err, msg) => {
          if (err) {
            console.error(`[NatsBus] Subscription error on ${subject}`, err)
            return
          }
          this.handleMessage(msg.subject, msg.data)
        },
      })
      this.subscriptions.set(subject, sub)
    } catch (err) {
      console.error(`[NatsBus] Failed to subscribe to subject ${subject}`, err)
    }
  }

  private subscribeToBroadcast() {
    try {
      const sub = this.connection.subscribe(this.broadcastSubject, {
        callback: (err, msg) => {
          if (err) {
            console.error('[NatsBus] Broadcast subscription error', err)
            return
          }
          this.handleBroadcastMessage(msg.data)
        },
      })
      this.subscriptions.set(this.broadcastSubject, sub)
    } catch (err) {
      console.error('[NatsBus] Failed to subscribe to broadcast subject', err)
    }
  }

  private unsubscribeFromSubject(subject: string) {
    const sub = this.subscriptions.get(subject)
    if (sub) {
      try {
        sub.unsubscribe()
        this.subscriptions.delete(subject)
      } catch (err) {
        console.error(`[NatsBus] Failed to unsubscribe from subject ${subject}`, err)
      }
    }
  }

  private handleMessage(subject: string, data: Uint8Array) {
    const decoder = new TextDecoder()
    const payload = decoder.decode(data)
    const parsed = safeJsonParse(payload)
    if (!parsed) return

    const topicPrefix = `${this.subjectPrefix}.topic.`
    if (subject.startsWith(topicPrefix)) {
      const topic = subject.slice(topicPrefix.length)
      this.maybeRetainTopic(topic, parsed)
    }

    const sinks = this.subjectSinks.get(subject)
    if (!sinks || sinks.size === 0) return
    for (const sink of sinks) {
      try {
        sink(parsed)
      } catch (err) {
        console.error('[NatsBus] Sink handler failed', err)
      }
    }
  }

  private handleBroadcastMessage(data: Uint8Array) {
    const decoder = new TextDecoder()
    const payload = decoder.decode(data)
    const parsed = safeJsonParse(payload)
    if (!parsed) return

    this.emitToAll(parsed)
  }

  private emitToAll(msg: SSEPayload) {
    for (const sink of this.sinkRefCount.keys()) {
      try {
        sink(msg)
      } catch (err) {
        console.error('[NatsBus] Sink handler failed', err)
      }
    }
  }

  async getRetainedTopic(topic: string): Promise<SSEPayload | null> {
    return this.retainedTopics.get(topic) ?? null
  }
}
