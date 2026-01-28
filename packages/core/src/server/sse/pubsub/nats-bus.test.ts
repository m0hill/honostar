import { describe, expect, test } from 'bun:test'
import type { PatchElementsOptions } from '../../../common/types'
import type { SSEPayload } from './memory'
import { NatsBus, type NatsConnection, type NatsMsg, type NatsSubscription } from './nats-bus'

const patch = (html: string): SSEPayload => ({
  event: 'datastar-patch-elements',
  html,
  options: {} as PatchElementsOptions,
})

const isPatchElements = (
  payload: SSEPayload
): payload is Extract<SSEPayload, { event: 'datastar-patch-elements' }> =>
  payload.event === 'datastar-patch-elements'

class StubNatsSubscription implements NatsSubscription {
  private unsubscribed = false
  public closed: Promise<void>
  private resolveClosed: () => void

  constructor(private onUnsubscribe: () => void) {
    this.resolveClosed = () => {}
    this.closed = new Promise(resolve => {
      this.resolveClosed = resolve
    })
  }

  unsubscribe() {
    if (!this.unsubscribed) {
      this.unsubscribed = true
      this.onUnsubscribe()
      this.resolveClosed()
    }
  }
}

class StubNatsConnection implements NatsConnection {
  private handlers = new Map<string, Array<(err: Error | null, msg: NatsMsg) => void>>()
  private subscriptions = new Map<string, StubNatsSubscription>()

  subscribe(
    subject: string,
    opts?: { callback?: (err: Error | null, msg: NatsMsg) => void }
  ): NatsSubscription {
    const callback = opts?.callback
    if (callback) {
      const callbacks = this.handlers.get(subject) ?? []
      callbacks.push(callback)
      this.handlers.set(subject, callbacks)
    }

    const sub = new StubNatsSubscription(() => {
      if (callback) {
        const callbacks = this.handlers.get(subject) ?? []
        const index = callbacks.indexOf(callback)
        if (index > -1) {
          callbacks.splice(index, 1)
        }
        if (callbacks.length === 0) {
          this.handlers.delete(subject)
        }
      }
      this.subscriptions.delete(subject)
    })

    this.subscriptions.set(subject, sub)
    return sub
  }

  publish(subject: string, data?: Uint8Array) {
    const callbacks = this.handlers.get(subject)
    if (callbacks && callbacks.length > 0) {
      const msg: NatsMsg = {
        data: data ?? new Uint8Array(),
        subject,
      }
      for (const cb of callbacks) {
        cb(null, msg)
      }
    }
  }

  async close() {
    for (const sub of this.subscriptions.values()) {
      sub.unsubscribe()
    }
    this.handlers.clear()
    this.subscriptions.clear()
  }

  // Test helper to simulate malformed messages
  emitRaw(subject: string, data: Uint8Array) {
    const callbacks = this.handlers.get(subject)
    if (callbacks && callbacks.length > 0) {
      const msg: NatsMsg = { data, subject }
      for (const cb of callbacks) {
        cb(null, msg)
      }
    }
  }
}

const tick = () => new Promise(resolve => setTimeout(resolve, 0))

function createNatsBus() {
  const connection = new StubNatsConnection()
  const bus = new NatsBus({
    connection,
    subjectPrefix: 'test',
  })
  return { bus, connection }
}

describe('NatsBus', () => {
  test('delivers client messages via NATS publish/subscribe', async () => {
    const { bus } = createNatsBus()
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
    const { bus, connection } = createNatsBus()
    let topicCount = 0
    bus.subscribeTopic('updates', () => {
      topicCount += 1
    })

    bus.toTopic('updates', patch('<p>1</p>'))
    await tick()
    expect(topicCount).toBe(1)

    const originalError = console.error
    console.error = () => {}
    const encoder = new TextEncoder()
    connection.emitRaw('test.topic.updates', encoder.encode('not-json'))
    await tick()
    console.error = originalError

    expect(topicCount).toBe(1) // invalid payload should be ignored
  })

  test('fans out to all sinks via toAll()', async () => {
    const { bus } = createNatsBus()
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

  test('unsubscribes from subject when last sink is removed', async () => {
    const { bus } = createNatsBus()
    let count = 0
    const unsub = bus.subscribeTopic('issues', () => {
      count += 1
    })

    bus.toTopic('issues', patch('<li>Issue A</li>'))
    await tick()
    expect(count).toBe(1)

    unsub()
    bus.toTopic('issues', patch('<li>Issue B</li>'))
    await tick()
    expect(count).toBe(1) // should not receive after unsubscribe
  })

  test('handles multiple subscribers to same subject', async () => {
    const { bus } = createNatsBus()
    let count1 = 0
    let count2 = 0

    const unsub1 = bus.subscribeTopic('shared', () => {
      count1 += 1
    })
    const unsub2 = bus.subscribeTopic('shared', () => {
      count2 += 1
    })

    bus.toTopic('shared', patch('<div>shared</div>'))
    await tick()

    expect(count1).toBe(1)
    expect(count2).toBe(1)

    unsub1()
    bus.toTopic('shared', patch('<div>shared2</div>'))
    await tick()

    expect(count1).toBe(1) // stopped receiving
    expect(count2).toBe(2) // still receiving

    unsub2()
  })

  test('maintains sink reference count across multiple subscriptions', async () => {
    const { bus } = createNatsBus()
    const received: string[] = []
    const sink = (payload: SSEPayload) => {
      if (isPatchElements(payload)) {
        received.push(payload.html)
      }
    }

    const unsub1 = bus.subscribeClient('client-1', sink)
    const unsub2 = bus.subscribeTopic('topic-1', sink)

    bus.toAll(patch('<div>broadcast</div>'))
    await tick()

    // Sink should receive broadcast only once despite being registered twice
    expect(received.length).toBe(1)
    expect(received[0]).toBe('<div>broadcast</div>')

    unsub1()
    received.length = 0

    bus.toAll(patch('<div>broadcast2</div>'))
    await tick()

    // Should still receive because one subscription is active
    expect(received.length).toBe(1)
    expect(received[0]).toBe('<div>broadcast2</div>')

    unsub2()
    received.length = 0

    bus.toAll(patch('<div>broadcast3</div>'))
    await tick()

    // Should not receive after all subscriptions are removed
    expect(received.length).toBe(0)
  })

  test('retains last idempotent topic patch for SSE reconnect self-heal (best-effort)', async () => {
    const { bus } = createNatsBus()
    bus.toTopic('issues:list', patch('<div id="issues-list">A</div>'))
    await tick()

    const retained = await bus.getRetainedTopic?.('issues:list')
    expect(retained).toBeTruthy()
    expect(retained?.event).toBe('datastar-patch-elements')
    if (retained?.event === 'datastar-patch-elements') {
      expect(retained.html).toContain('issues-list')
    }
  })

  test('does not retain order-dependent append patches', async () => {
    const { bus } = createNatsBus()
    bus.toTopic('chat', {
      event: 'datastar-patch-elements',
      html: '<li id="m1">hello</li>',
      options: { mode: 'append', selector: '#chat' },
    })
    await tick()
    const retained = await bus.getRetainedTopic?.('chat')
    expect(retained).toBeNull()
  })
})
