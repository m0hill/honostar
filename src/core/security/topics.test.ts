import { beforeEach, describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import { type BonsaiConfig, createConfig } from '@/core/config'
import type { AppEnv } from '@/core/context'
import { canonicalizeTopics, signTopics, verifyTopics } from './topics'

describe('canonicalizeTopics', () => {
  test('sorts topics alphabetically', () => {
    expect(canonicalizeTopics(['zebra', 'apple', 'banana'])).toEqual(['apple', 'banana', 'zebra'])
  })

  test('removes duplicates', () => {
    expect(canonicalizeTopics(['apple', 'banana', 'apple', 'banana'])).toEqual(['apple', 'banana'])
  })

  test('handles empty array', () => {
    expect(canonicalizeTopics([])).toEqual([])
  })

  test('handles single topic', () => {
    expect(canonicalizeTopics(['single'])).toEqual(['single'])
  })
})

describe('Topic security integration', () => {
  let config: BonsaiConfig

  beforeEach(() => {
    process.env.BONSAI_SIGNING_SECRET = 'test-secret-key-for-testing-only-minimum-32-chars'
    config = createConfig()
  })

  test('full sign and verify flow with valid token', async () => {
    const app = new Hono<AppEnv>()
    let signedToken: string | null = null

    // Setup middleware to sign topics
    app.use('*', async (c, next) => {
      c.set('clientId', 'test-client-123')
      await next()
    })

    // Route that signs topics
    app.get('/sign', async c => {
      const token = await signTopics(c, ['issues:list', 'users:123'], config)
      signedToken = token
      return c.text('signed')
    })

    // Route that verifies topics
    app.get('/verify', async c => {
      const allowed = await verifyTopics(c, ['issues:list'], config)
      return c.json({ allowed })
    })

    // Sign topics
    const signRes = await app.request('/sign')
    expect(signRes.status).toBe(200)
    expect(signedToken).toBeTruthy()

    // Extract cookie from response
    const setCookie = signRes.headers.get('set-cookie')
    expect(setCookie).toBeTruthy()
    expect(setCookie).toContain('bonsai_topics=')

    // Verify with the cookie
    const verifyRes = await app.request('/verify', {
      headers: {
        Cookie: setCookie!,
      },
    })

    const body = await verifyRes.json()
    expect(body.allowed).toEqual(['issues:list'])
  })

  test('verify returns intersection of requested and allowed', async () => {
    const app = new Hono<AppEnv>()
    let cookieValue: string | null = null

    app.use('*', async (c, next) => {
      c.set('clientId', 'test-client-789')
      await next()
    })

    app.get('/sign', async c => {
      await signTopics(c, ['issues:list', 'users:123', 'comments:456'], config)
      return c.text('signed')
    })

    app.get('/verify', async c => {
      const allowed = await verifyTopics(
        c,
        ['issues:list', 'unauthorized:topic', 'users:123'],
        config
      )
      return c.json({ allowed })
    })

    const signRes = await app.request('/sign')
    cookieValue = signRes.headers.get('set-cookie')

    const verifyRes = await app.request('/verify', {
      headers: { Cookie: cookieValue! },
    })

    const body = await verifyRes.json()
    expect(body.allowed).toEqual(['issues:list', 'users:123'])
  })

  test('verify returns null when cookie is missing', async () => {
    const app = new Hono<AppEnv>()

    app.use('*', async (c, next) => {
      c.set('clientId', 'test-client-456')
      await next()
    })

    app.get('/verify', async c => {
      const allowed = await verifyTopics(c, ['test:topic'], config)
      return c.json({ allowed })
    })

    const res = await app.request('/verify')
    const body = await res.json()
    expect(body.allowed).toBeNull()
  })

  test('verify returns null when clientId mismatch', async () => {
    const app = new Hono<AppEnv>()
    let cookieValue: string | null = null

    // Sign with client-A
    app.get('/sign', async c => {
      c.set('clientId', 'client-A')
      await signTopics(c, ['test:topic'], config)
      return c.text('signed')
    })

    // Verify with client-B
    app.get('/verify', async c => {
      c.set('clientId', 'client-B')
      const allowed = await verifyTopics(c, ['test:topic'], config)
      return c.json({ allowed })
    })

    const signRes = await app.request('/sign')
    cookieValue = signRes.headers.get('set-cookie')

    const verifyRes = await app.request('/verify', {
      headers: { Cookie: cookieValue! },
    })

    const body = await verifyRes.json()
    expect(body.allowed).toBeNull()
  })

  test('allows all topics in development when no secret', async () => {
    delete process.env.BONSAI_SIGNING_SECRET
    process.env.NODE_ENV = 'development'

    const app = new Hono<AppEnv>()

    app.use('*', async (c, next) => {
      c.set('clientId', 'test-client')
      await next()
    })

    app.get('/verify', async c => {
      const allowed = await verifyTopics(c, ['any:topic', 'another:topic'], config)
      return c.json({ allowed })
    })

    const res = await app.request('/verify')
    const body = await res.json()
    expect(body.allowed).toEqual(['any:topic', 'another:topic'])
  })

  test('empty intersection returns empty array', async () => {
    const app = new Hono<AppEnv>()
    let cookieValue: string | null = null

    app.use('*', async (c, next) => {
      c.set('clientId', 'test-client')
      await next()
    })

    app.get('/sign', async c => {
      await signTopics(c, ['issues:list', 'users:123'], config)
      return c.text('signed')
    })

    app.get('/verify', async c => {
      const allowed = await verifyTopics(c, ['unauthorized:topic', 'another:unauthorized'], config)
      return c.json({ allowed })
    })

    const signRes = await app.request('/sign')
    cookieValue = signRes.headers.get('set-cookie')

    const verifyRes = await app.request('/verify', {
      headers: { Cookie: cookieValue! },
    })

    const body = await verifyRes.json()
    expect(body.allowed).toEqual([])
  })
})
