import type { PubSubBus, Sink, SSEPayload } from '@/honostar/server/sse/pubsub/bus'

export interface RedisClient {
  publish(...args: unknown[]): Promise<unknown>
  subscribe(...args: unknown[]): Promise<unknown>
  unsubscribe(...args: unknown[]): Promise<unknown>
  on(event: string, listener: (...args: unknown[]) => void): unknown
  duplicate?: () => RedisClient
  connect?: () => Promise<unknown>
}

export type RedisBusOptions = {
  publisher: RedisClient
  subscriber?: RedisClient
  channelPrefix?: string
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
    console.error('[RedisBus] Failed to parse payload', err)
    return null
  }
}

export class RedisBus implements PubSubBus {
  private publisher: RedisClient
  private subscriber: RedisClient
  private channelPrefix: string
  private broadcastChannel: string
  private channelSinks = new Map<string, Set<Sink>>()
  private sinkRefCount = new Map<Sink, number>()

  constructor(options: RedisBusOptions) {
    this.publisher = options.publisher
    const subscriber = options.subscriber ?? options.publisher.duplicate?.()
    if (!subscriber) {
      throw new Error('RedisBus requires a dedicated subscriber connection.')
    }
    this.subscriber = subscriber
    this.channelPrefix = options.channelPrefix ?? 'honostar:bus'
    this.broadcastChannel = this.channelName('broadcast', 'all')

    this.subscriber.on('message', (...args: unknown[]) => {
      const channel = typeof args[0] === 'string' ? args[0] : null
      const payload = typeof args[1] === 'string' ? args[1] : null
      if (channel && payload) {
        this.handleMessage(channel, payload)
      }
    })

    void this.subscriber.subscribe(this.broadcastChannel).catch(err => {
      console.error('[RedisBus] Failed to subscribe to broadcast channel', err)
    })
  }

  subscribeClient(clientId: string, sink: Sink) {
    const channel = this.channelName('client', clientId)
    return this.registerSink(channel, sink)
  }

  subscribeTopic(topic: string, sink: Sink) {
    const channel = this.channelName('topic', topic)
    return this.registerSink(channel, sink)
  }

  toClient(clientId: string, msg: SSEPayload) {
    const channel = this.channelName('client', clientId)
    this.publish(channel, msg)
  }

  toTopic(topic: string, msg: SSEPayload) {
    const channel = this.channelName('topic', topic)
    this.publish(channel, msg)
  }

  toAll(msg: SSEPayload) {
    this.publish(this.broadcastChannel, msg)
  }

  private channelName(kind: 'client' | 'topic' | 'broadcast', id: string) {
    return `${this.channelPrefix}:${kind}:${id}`
  }

  private registerSink(channel: string, sink: Sink) {
    let sinks = this.channelSinks.get(channel)
    if (!sinks) {
      sinks = new Set()
      this.channelSinks.set(channel, sinks)
      void this.subscriber.subscribe(channel).catch(err => {
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
        void this.subscriber.unsubscribe(channel).catch(err => {
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
    this.publisher.publish(channel, payload).catch(err => {
      console.error(`[RedisBus] Failed to publish to channel ${channel}`, err)
    })
  }

  private handleMessage(channel: string, payload: string) {
    const parsed = safeJsonParse(payload)
    if (!parsed) return

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
        console.error('[RedisBus] Sink handler failed', err)
      }
    }
  }

  private emitToAll(msg: SSEPayload) {
    for (const sink of this.sinkRefCount.keys()) {
      try {
        sink(msg)
      } catch (err) {
        console.error('[RedisBus] Sink handler failed', err)
      }
    }
  }
}
