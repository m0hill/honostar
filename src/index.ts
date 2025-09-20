import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { except } from 'hono/combine'
import { compress } from 'hono/compress'
import { logger } from 'hono/logger'
import {
  type AppEnv,
  createSseEndpoint,
  datastarResponder,
  fxResponder,
  initContext,
  mountRoutes,
  renderer,
} from '@/core'
import '@/core/polyfills/compression.js'

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
