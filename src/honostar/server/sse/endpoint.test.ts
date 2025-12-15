import { beforeEach, describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import type { AppEnv } from '@/honostar/server/context'
import { createSseEndpoint } from '@/honostar/server/sse/endpoint'
import { MemoryBus } from '@/honostar/server/sse/pubsub/memory'
import { TopicQueryRegistry } from '@/honostar/server/sse/queries'

const tick = () => new Promise(resolve => setTimeout(resolve, 0))

describe('createSseEndpoint retained topic replay', () => {
  beforeEach(() => {
    delete process.env.HONOSTAR_SIGNING_SECRET
    process.env.NODE_ENV = 'development'
  })

  test('replays the retained topic patch immediately on connect', async () => {
    const bus = new MemoryBus()
    bus.toTopic('issues:list', {
      event: 'datastar-patch-elements',
      html: '<div id="issues-list">A</div>',
      options: {},
    })

    const app = new Hono<AppEnv>()
    app.use('*', async (c, next) => {
      c.set('clientId', c.req.header('X-Tab-ID') ?? 'anonymous')
      c.set('bus', bus)
      await next()
    })
    app.get('/_/events', createSseEndpoint())

    const ac = new AbortController()
    const res = await app.request('/_/events?topics=issues:list', {
      headers: {
        'X-Tab-ID': 'client-1',
        'Datastar-Request': 'true',
      },
      signal: ac.signal,
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')

    const reader = res.body?.getReader()
    expect(reader).toBeTruthy()
    if (!reader) return

    const decoder = new TextDecoder()
    let text = ''

    // Read a few chunks until we see the retained patch.
    for (let i = 0; i < 20; i++) {
      const { value, done } = await reader.read()
      if (done) break
      if (value) text += decoder.decode(value)
      if (text.includes('event: datastar-patch-elements') && text.includes('issues-list')) {
        break
      }
      await tick()
    }

    ac.abort()

    expect(text).toContain('event: datastar-patch-elements')
    expect(text).toContain('data: elements <div id="issues-list">A</div>')
  })
})

describe('createSseEndpoint CQRS topic queries', () => {
  beforeEach(() => {
    delete process.env.HONOSTAR_SIGNING_SECRET
    process.env.NODE_ENV = 'development'
  })

  test('runs a registered query on connect and again on honostar-event', async () => {
    const bus = new MemoryBus()
    const queries = new TopicQueryRegistry()
    const topic = 'issue:123:comments'

    queries.register(/^issue:(?<id>\d+):comments$/, async ({ event }) => {
      return [['patch-elements', `<div id="comments-section">${event ? 'EVENT' : 'INIT'}</div>`]]
    })

    const app = new Hono<AppEnv>()
    app.use('*', async (c, next) => {
      c.set('clientId', c.req.header('X-Tab-ID') ?? 'anonymous')
      c.set('bus', bus)
      c.set('queries', queries)
      await next()
    })
    app.get('/_/events', createSseEndpoint())

    const ac = new AbortController()
    const res = await app.request(`/_/events?topics=${topic}`, {
      headers: {
        'X-Tab-ID': 'client-1',
        'Datastar-Request': 'true',
      },
      signal: ac.signal,
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')

    const reader = res.body?.getReader()
    expect(reader).toBeTruthy()
    if (!reader) return

    const decoder = new TextDecoder()
    let text = ''

    // Wait for initial query patch.
    for (let i = 0; i < 50; i++) {
      const { value, done } = await reader.read()
      if (done) break
      if (value) text += decoder.decode(value)
      if (text.includes('comments-section') && text.includes('INIT')) {
        break
      }
      await tick()
    }

    // Trigger a domain event and expect the query to re-run.
    bus.toTopic(topic, { event: 'honostar-event', name: 'comment:created', payload: 'null' })

    for (let i = 0; i < 50; i++) {
      const { value, done } = await reader.read()
      if (done) break
      if (value) text += decoder.decode(value)
      if (text.includes('comments-section') && text.includes('EVENT')) {
        break
      }
      await tick()
    }

    ac.abort()

    expect(text).toContain('data: elements <div id="comments-section">INIT</div>')
    expect(text).toContain('data: elements <div id="comments-section">EVENT</div>')
  })
})
