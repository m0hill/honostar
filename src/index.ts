import '@/core/polyfills/compression.js'
import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { bus } from '@/core/bus'
import type { AppEnv } from '@/core/context'
import { renderer } from '@/core/renderer'
import { mountRoutes } from '@/core/router'
import { sseEndpoint } from '@/core/sse'
import { db } from '@/db'

const app = new Hono<AppEnv>()

app.use('/datastar.js', serveStatic({ path: './public/datastar.js' }))

app.use('*', renderer())

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

app.get('/_/events', sseEndpoint())

await mountRoutes(app)

export default app
