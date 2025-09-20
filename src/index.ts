import '@/core/polyfills/compression.js'
import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { compress } from 'hono/compress'
import type { AppEnv } from '@/core/context'
import { renderer } from '@/core/renderer'
import { mountRoutes } from '@/core/router'
import { sseEndpoint } from '@/core/sse'
import { bus } from '@/core/sse/bus'
import { datastarResponder } from '@/core/sse/helpers'
import { fxResponder } from '@/core/sse/middleware'
import { db } from '@/db'

const app = new Hono<AppEnv>()

app.use('/*', serveStatic({ root: './public' }))

const compression = compress()
app.use('*', async (c, next) => {
  if (c.req.path.startsWith('/_/events')) {
    return next()
  }
  return compression(c, next)
})

app.use('*', renderer())
app.use('*', datastarResponder())
app.use('*', fxResponder())

app.use('*', async (c, next) => {
  const cookie = c.req.header('cookie') ?? ''
  const m = /cid=([a-zA-Z0-9_-]+)/.exec(cookie)
  const clientId = m?.[1] ?? crypto.randomUUID()
  if (!m) c.header('Set-Cookie', `cid=${clientId}; Path=/; HttpOnly; SameSite=Lax`)

  c.set('db', db)
  c.set('bus', bus)
  c.set('clientId', clientId)
  await next()
})

app.use('/_/events', async (c, next) => {
  c.set('sseTopics', [''])
  await next()
})

app.get('/_/events', sseEndpoint())

await mountRoutes(app)

export default app
