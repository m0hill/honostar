import * as assert from 'node:assert/strict'
import { describe, it } from 'node:test'
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

void describe('MemoryBus', () => {
  void it('delivers messages to client subscribers', () => {
    const bus = new MemoryBus()
    const received: SSEPayload[] = []
    const unsubscribe = bus.subscribeClient('client-1', payload => {
      received.push(payload)
    })

    bus.toClient('client-1', patch('<div>a</div>'))
    bus.toClient('client-1', patch('<div>b</div>'))

    assert.equal(received.length, 2)
    const first = received[0]
    assert.ok(first && isPatchElements(first))
    assert.equal(first.html, '<div>a</div>')
    const second = received[1]
    assert.ok(second && isPatchElements(second))
    assert.equal(second.html, '<div>b</div>')

    unsubscribe()
    bus.toClient('client-1', patch('<div>ignored</div>'))
    assert.equal(received.length, 2)
  })

  void it('delivers topic broadcasts and cleans up when last subscriber leaves', () => {
    const bus = new MemoryBus()
    let count = 0
    const unsub = bus.subscribeTopic('issues', () => {
      count += 1
    })

    bus.toTopic('issues', patch('<li>Issue A</li>'))
    assert.equal(count, 1)

    unsub()
    bus.toTopic('issues', patch('<li>Issue B</li>'))
    assert.equal(count, 1)
  })

  void it('broadcasts to every registered sink via toAll()', () => {
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
    assert.equal(clientHits, 1)
    assert.equal(topicHits, 1)
  })
})
