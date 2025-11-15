import { describe, expect, test } from 'bun:test'
import { EventEmitter } from 'node:events'
import type { PatchElementsOptions } from '@/honostar/common/types'
import type { SSEPayload } from '@/honostar/server/sse/pubsub/memory'
import { RedisBus, type RedisClient } from '@/honostar/server/sse/pubsub/redis-bus'

const patch = (html: string): SSEPayload => ({
  event: 'datastar-patch-elements',
  html,
  options: {} as PatchElementsOptions,
})

const isPatchElements = (
  payload: SSEPayload
): payload is Extract<SSEPayload, { event: 'datastar-patch-elements' }> =>
  payload.event === 'datastar-patch-elements'

class StubRedis extends EventEmitter implements RedisClient {
  private dispatcher: EventEmitter
  private subscriptions = new Map<string, (...args: unknown[]) => void>()

  constructor(dispatcher?: EventEmitter) {
    super()
    this.dispatcher = dispatcher ?? new EventEmitter()
  }

  duplicate(): RedisClient {
    return new StubRedis(this.dispatcher)
  }

  async publish(...args: unknown[]) {
    const channel = typeof args[0] === 'string' ? args[0] : ''
    const payload = typeof args[1] === 'string' ? args[1] : ''
    this.dispatcher.emit(channel, payload)
    return 1
  }

  async subscribe(...channels: unknown[]) {
    const all = channels.map(ch => String(ch))
    for (const ch of all) {
      const handler = (...args: unknown[]) => {
        const payload = typeof args[0] === 'string' ? args[0] : ''
        this.emit('message', ch, payload)
      }
      this.dispatcher.on(ch, handler)
      this.subscriptions.set(ch, handler)
    }
    return 1
  }

  async unsubscribe(...channels: unknown[]) {
    const all = channels.map(ch => String(ch))
    for (const ch of all) {
      const handler = this.subscriptions.get(ch)
      if (handler) {
        this.dispatcher.off(ch, handler)
        this.subscriptions.delete(ch)
      }
    }
    return 1
  }

  async connect() {
    return this
  }
}

const tick = () => new Promise(resolve => setTimeout(resolve, 0))

function createRedisBus() {
  const dispatcher = new EventEmitter()
  const publisher = new StubRedis(dispatcher)
  const subscriber = new StubRedis(dispatcher)
  const bus = new RedisBus({
    publisher,
    subscriber,
    channelPrefix: 'test',
  })
  return { bus, publisher, subscriber }
}

describe('RedisBus', () => {
  test('delivers client messages via Redis publish/subscribe', async () => {
    const { bus } = createRedisBus()
    const received: SSEPayload[] = []
    bus.subscribeClient('a', payload => {
      received.push(payload)
    })

    bus.toClient('a', patch('<div>a</div>'))
    await tick()

    expect(received.length).toBe(1)
    const first = received[0]
    expect(first).toBeTruthy()
    expect(isPatchElements(first!)).toBe(true)
    if (isPatchElements(first!)) {
      expect(first.html).toBe('<div>a</div>')
    }
  })

  test('broadcasts topics and ignores invalid payloads', async () => {
    const { bus, subscriber } = createRedisBus()
    let topicCount = 0
    bus.subscribeTopic('updates', () => {
      topicCount += 1
    })

    bus.toTopic('updates', patch('<p>1</p>'))
    await tick()
    expect(topicCount).toBe(1)

    const originalError = console.error
    console.error = () => {}
    subscriber.emit('message', 'test:topic:updates', 'not-json')
    await tick()
    console.error = originalError

    expect(topicCount).toBe(1) // invalid payload should be ignored
  })

  test('fans out to all sinks via toAll()', async () => {
    const { bus } = createRedisBus()
    let clientHits = 0
    let topicHits = 0

    bus.subscribeClient('alpha', () => {
      clientHits += 1
    })
    bus.subscribeTopic('beta', () => {
      topicHits += 1
    })

    bus.toAll(patch('<span>ping</span>'))
    await tick()

    expect(clientHits).toBe(1)
    expect(topicHits).toBe(1)
  })
})
