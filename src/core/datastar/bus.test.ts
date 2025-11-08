import { describe, expect, test } from 'bun:test'
import { MemoryBus, type SSEPayload } from '@/core/datastar/bus'
import type { PatchElementsOptions } from '@/core/datastar/types'

const patch = (html: string): SSEPayload => ({
  event: 'datastar-patch-elements',
  html,
  options: {} as PatchElementsOptions,
})

const isPatchElements = (
  payload: SSEPayload
): payload is Extract<SSEPayload, { event: 'datastar-patch-elements' }> =>
  payload.event === 'datastar-patch-elements'

describe('MemoryBus', () => {
  test('delivers messages to client subscribers', () => {
    const bus = new MemoryBus()
    const received: SSEPayload[] = []
    const unsubscribe = bus.subscribeClient('client-1', payload => {
      received.push(payload)
    })

    bus.toClient('client-1', patch('<div>a</div>'))
    bus.toClient('client-1', patch('<div>b</div>'))

    expect(received.length).toBe(2)
    const first = received[0]
    expect(first).toBeTruthy()
    expect(isPatchElements(first!)).toBe(true)
    if (isPatchElements(first!)) {
      expect(first.html).toBe('<div>a</div>')
    }
    const second = received[1]
    expect(second).toBeTruthy()
    expect(isPatchElements(second!)).toBe(true)
    if (isPatchElements(second!)) {
      expect(second.html).toBe('<div>b</div>')
    }

    unsubscribe()
    bus.toClient('client-1', patch('<div>ignored</div>'))
    expect(received.length).toBe(2)
  })

  test('delivers topic broadcasts and cleans up when last subscriber leaves', () => {
    const bus = new MemoryBus()
    let count = 0
    const unsub = bus.subscribeTopic('issues', () => {
      count += 1
    })

    bus.toTopic('issues', patch('<li>Issue A</li>'))
    expect(count).toBe(1)

    unsub()
    bus.toTopic('issues', patch('<li>Issue B</li>'))
    expect(count).toBe(1)
  })

  test('broadcasts to every registered sink via toAll()', () => {
    const bus = new MemoryBus()
    let clientHits = 0
    let topicHits = 0

    bus.subscribeClient('alpha', () => {
      clientHits += 1
    })
    bus.subscribeTopic('beta', () => {
      topicHits += 1
    })

    bus.toAll(patch('<span>ping</span>'))
    expect(clientHits).toBe(1)
    expect(topicHits).toBe(1)
  })
})
