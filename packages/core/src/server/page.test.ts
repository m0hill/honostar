import { describe, expect, test } from 'bun:test'
import type { Context } from 'hono'
import { Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv } from './context'
import { createHandler } from './page'

describe('createHandler request parsing', () => {
  test('parses GET query string params', async () => {
    const route = createHandler({
      schema: z.object({
        search: z.string().optional().default(''),
        status: z.enum(['open', 'closed', 'all']).optional().default('open'),
      }),
      hook: () => new Response('invalid', { status: 400 }),
      async handler(c, data) {
        return c.json({ search: data.search, status: data.status })
      },
    })

    const app = new Hono<AppEnv>()
    app.get(
      '/',
      (route as unknown as { handler: (c: Context<AppEnv>) => Promise<Response> }).handler
    )

    const res = await app.request('/?search=bug&status=closed')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ search: 'bug', status: 'closed' })
  })

  test('merges GET query string with datastar payload (datastar wins)', async () => {
    const route = createHandler({
      schema: z.object({
        search: z.string().optional().default(''),
        status: z.enum(['open', 'closed', 'all']).optional().default('open'),
      }),
      hook: () => new Response('invalid', { status: 400 }),
      async handler(c, data) {
        return c.json({ search: data.search, status: data.status })
      },
    })

    const app = new Hono<AppEnv>()
    app.get(
      '/',
      (route as unknown as { handler: (c: Context<AppEnv>) => Promise<Response> }).handler
    )

    const datastar = encodeURIComponent(JSON.stringify({ search: 'hello', status: 'open' }))
    const res = await app.request(`/?search=bug&status=closed&datastar=${datastar}`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ search: 'hello', status: 'open' })
  })

  test('parses application/x-www-form-urlencoded bodies', async () => {
    const route = createHandler({
      schema: z.object({ name: z.string() }),
      hook: () => new Response('invalid', { status: 400 }),
      async handler(c, data) {
        return c.json({ name: data.name })
      },
    })

    const app = new Hono<AppEnv>()
    app.post(
      '/',
      (route as unknown as { handler: (c: Context<AppEnv>) => Promise<Response> }).handler
    )

    const res = await app.request('/', {
      method: 'POST',
      body: new URLSearchParams({ name: 'alice' }),
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ name: 'alice' })
  })

  test('parses multipart/form-data bodies (including File)', async () => {
    const route = createHandler({
      schema: z.object({
        note: z.string(),
        upload: z.instanceof(File),
      }),
      hook: () => new Response('invalid', { status: 400 }),
      async handler(c, data) {
        return c.json({
          note: data.note,
          filename: data.upload.name,
          isFile: data.upload instanceof File,
        })
      },
    })

    const app = new Hono<AppEnv>()
    app.post(
      '/',
      (route as unknown as { handler: (c: Context<AppEnv>) => Promise<Response> }).handler
    )

    const form = new FormData()
    form.set('note', 'hello')
    form.set('upload', new File(['hi'], 'hi.txt', { type: 'text/plain' }))

    const res = await app.request('/', {
      method: 'POST',
      body: form,
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ note: 'hello', filename: 'hi.txt', isFile: true })
  })
})
