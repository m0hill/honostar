import { describe, expect, test } from 'bun:test'
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

    expect(body.token).toBeTruthy()
    expect(typeof body.token).toBe('string')
    expect(body.token.length).toBeGreaterThan(0)
  })

  test('sets CSRF token cookie', async () => {
    const app = new Hono<AppEnv>()
    app.use('*', csrf())
    app.get('/test', c => c.text('ok'))

    const res = await app.request('/test')
    const cookies = res.headers.get('set-cookie')

    expect(cookies).toBeTruthy()
    expect(cookies).toContain('ds_csrf=')
  })

  test('allows safe methods without CSRF check', async () => {
    const app = new Hono<AppEnv>()
    app.use('*', csrf())
    app.get('/get', c => c.text('GET ok'))
    app.options('/options', c => c.text('OPTIONS ok'))

    const getRes = await app.request('/get')
    expect(getRes.status).toBe(200)

    const optionsRes = await app.request('/options', { method: 'OPTIONS' })
    expect(optionsRes.status).toBe(200)
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

    expect(validRes.status).toBe(200)
  })

  test('rejects POST without CSRF token', async () => {
    const app = new Hono<AppEnv>()
    app.use('*', csrf())
    app.post('/submit', c => c.text('ok'))

    const res = await app.request('/submit', {
      method: 'POST',
    })

    expect(res.status).toBe(403)
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

    expect(res.status).toBe(403)
  })

  test('validates CSRF token for PUT requests', async () => {
    const app = new Hono<AppEnv>()
    app.use('*', csrf())
    app.put('/update', c => c.text('ok'))

    const res = await app.request('/update', {
      method: 'PUT',
    })

    expect(res.status).toBe(403)
  })

  test('validates CSRF token for DELETE requests', async () => {
    const app = new Hono<AppEnv>()
    app.use('*', csrf())
    app.delete('/delete', c => c.text('ok'))

    const res = await app.request('/delete', {
      method: 'DELETE',
    })

    expect(res.status).toBe(403)
  })

  test('validates CSRF token for PATCH requests', async () => {
    const app = new Hono<AppEnv>()
    app.use('*', csrf())
    app.patch('/patch', c => c.text('ok'))

    const res = await app.request('/patch', {
      method: 'PATCH',
    })

    expect(res.status).toBe(403)
  })

  test('generates unique tokens per request', async () => {
    const app = new Hono<AppEnv>()
    app.use('*', csrf())
    app.get('/token', c => c.json({ token: c.var.csrfToken! }))

    const res1 = await app.request('/token')
    const res2 = await app.request('/token')

    const body1 = (await res1.json()) as { token: string }
    const body2 = (await res2.json()) as { token: string }

    expect(body1.token).not.toBe(body2.token)
  })
})
