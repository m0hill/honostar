import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { Hono } from 'hono'
import type { AppEnv } from './context'
import { csrf } from './security'

describe('csrf', () => {
  test('generates CSRF token and stores in context', async () => {
    const app = new Hono<AppEnv>()
    app.use('*', csrf())
    app.get('/test', c => {
      return c.json({ token: c.var.csrfToken! })
    })

    const res = await app.request('/test')
    const body = (await res.json()) as { token: string }

    assert.ok(body.token, 'CSRF token should be present')
    assert.ok(typeof body.token === 'string', 'Token should be a string')
    assert.ok(body.token.length > 0, 'Token should not be empty')
  })

  test('sets CSRF token cookie', async () => {
    const app = new Hono<AppEnv>()
    app.use('*', csrf())
    app.get('/test', c => c.text('ok'))

    const res = await app.request('/test')
    const cookies = res.headers.get('set-cookie')

    assert.ok(cookies, 'Should set cookies')
    assert.ok(cookies.includes('ds_csrf='), 'Should set ds_csrf cookie')
  })

  test('allows safe methods without CSRF check', async () => {
    const app = new Hono<AppEnv>()
    app.use('*', csrf())
    app.get('/get', c => c.text('GET ok'))
    app.options('/options', c => c.text('OPTIONS ok'))

    const getRes = await app.request('/get')
    assert.equal(getRes.status, 200)

    const optionsRes = await app.request('/options', { method: 'OPTIONS' })
    assert.equal(optionsRes.status, 200)
  })

  test('validates CSRF token for POST requests', async () => {
    const app = new Hono<AppEnv>()
    app.use('*', csrf())
    app.post('/submit', c => c.text('ok'))

    // First get a token
    app.get('/token', c => c.json({ token: c.var.csrfToken! }))

    const tokenRes = await app.request('/token')
    const cookies = tokenRes.headers.get('set-cookie')
    const { token } = (await tokenRes.json()) as { token: string }

    // Valid POST with token
    const validRes = await app.request('/submit', {
      method: 'POST',
      headers: {
        'X-CSRF-Token': token,
        Cookie: cookies || '',
      },
    })

    assert.equal(validRes.status, 200, 'Valid CSRF token should pass')
  })

  test('rejects POST without CSRF token', async () => {
    const app = new Hono<AppEnv>()
    app.use('*', csrf())
    app.post('/submit', c => c.text('ok'))

    const res = await app.request('/submit', {
      method: 'POST',
    })

    assert.equal(res.status, 403, 'Should reject POST without CSRF token')
  })

  test('rejects POST with invalid CSRF token', async () => {
    const app = new Hono<AppEnv>()
    app.use('*', csrf())
    app.post('/submit', c => c.text('ok'))

    const res = await app.request('/submit', {
      method: 'POST',
      headers: {
        'X-CSRF-Token': 'invalid-token',
      },
    })

    assert.equal(res.status, 403, 'Should reject POST with invalid CSRF token')
  })

  test('validates CSRF token for PUT requests', async () => {
    const app = new Hono<AppEnv>()
    app.use('*', csrf())
    app.put('/update', c => c.text('ok'))

    const res = await app.request('/update', {
      method: 'PUT',
    })

    assert.equal(res.status, 403, 'Should validate CSRF for PUT')
  })

  test('validates CSRF token for DELETE requests', async () => {
    const app = new Hono<AppEnv>()
    app.use('*', csrf())
    app.delete('/delete', c => c.text('ok'))

    const res = await app.request('/delete', {
      method: 'DELETE',
    })

    assert.equal(res.status, 403, 'Should validate CSRF for DELETE')
  })

  test('validates CSRF token for PATCH requests', async () => {
    const app = new Hono<AppEnv>()
    app.use('*', csrf())
    app.patch('/patch', c => c.text('ok'))

    const res = await app.request('/patch', {
      method: 'PATCH',
    })

    assert.equal(res.status, 403, 'Should validate CSRF for PATCH')
  })

  test('generates unique tokens per request', async () => {
    const app = new Hono<AppEnv>()
    app.use('*', csrf())
    app.get('/token', c => c.json({ token: c.var.csrfToken! }))

    const res1 = await app.request('/token')
    const res2 = await app.request('/token')

    const body1 = (await res1.json()) as { token: string }
    const body2 = (await res2.json()) as { token: string }

    assert.notEqual(body1.token, body2.token, 'Each request should get a unique token')
  })
})
