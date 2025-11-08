import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { except } from 'hono/combine'
import { compress } from 'hono/compress'
import { logger } from 'hono/logger'
import {
  type AppEnv,
  createSseEndpoint,
  csrf,
  datastarResponder,
  fxResponder,
  initContext,
  mountRoutes,
  renderer,
} from '@/core'

import '@/core/polyfills/compression.js'
import { createManifestRouteLoader } from '@/core/router/manifest-route-loader'
import { auth } from '@/middleware/auth'
import { attachBus } from '@/middleware/bus'
import { attachDb } from '@/middleware/db'
import { routesManifest } from '@/routes.manifest'

const app = new Hono<AppEnv>()

app.use('/*', serveStatic({ root: './public' }))
app.use('/images/*', serveStatic({ root: './' }))

app.use('*', logger())

app.use('*', except('/_/events', compress()))

// Zero-config usage with framework defaults
// Optional: Pass BonsaiConfig for custom asset paths, CSP, SSE config, etc.
app.use('*', csrf())

app.use('*', renderer())
app.use('*', initContext)
app.use('*', attachBus)
app.use('*', datastarResponder)
app.use('*', fxResponder)
app.use('*', attachDb)
app.use('*', auth)

app.get('/_/events', createSseEndpoint())

await mountRoutes(app, createManifestRouteLoader(routesManifest))

export default app
