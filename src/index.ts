import '@/core/polyfills/compression.js'
import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { except } from 'hono/combine'
import { compress } from 'hono/compress'

import { logger } from 'hono/logger'
import type { AppEnv } from '@/core/context'

import { createSseEndpoint } from '@/core/datastar/endpoint'
import { fxResponder } from '@/core/datastar/middleware'
import { datastarResponder } from '@/core/datastar/responder'
import { initContext } from '@/core/middleware'
import { renderer } from '@/core/renderer'
import { mountRoutes } from '@/core/router'

const app = new Hono<AppEnv>()

app.use('/*', serveStatic({ root: './public' }))

app.use('*', logger())

app.use('*', except('/_/events', compress()))

app.use('*', renderer)
app.use('*', datastarResponder)
app.use('*', fxResponder)

app.use('*', initContext)

app.use('/_/events', async (c, next) => {
  c.set('sseTopics', [''])
  await next()
})

app.get('/_/events', createSseEndpoint())

await mountRoutes(app)

export default app
