import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { except } from 'hono/combine'
import { compress } from 'hono/compress'
import { logger } from 'hono/logger'
import {
  type AppEnv,
  createConfig,
  createSseEndpoint,
  csrf,
  fxResponder,
  initContext,
  mountRoutes,
  registerEffects,
  renderer,
} from '@/honostar/server'

import '@/honostar/server/polyfills/compression.js'

// Define your application config
const config = createConfig({
  assets: {
    css: '/styles.css',
    runtime: '/runtime.js',
    datastar: '/datastar.js',
    plugins: ['/plugins.js'],
  },
})

import { customEffects } from '@/effects'
import { createManifestRouteLoader } from '@/honostar/server/router/manifest-route-loader'
import { auth } from '@/middleware/auth'
import { attachBus } from '@/middleware/bus'
import { attachDb } from '@/middleware/db'
import { routesManifest } from '@/routes.manifest'

const app = new Hono<AppEnv>()

app.use('/*', serveStatic({ root: './public' }))
app.use('/images/*', serveStatic({ root: './' }))

app.use('*', logger())

app.use('*', except('/_/events', compress()))

// Pass config to framework middleware
app.use('*', csrf(config))
app.use('*', renderer(config))
app.use('*', initContext)
app.use('*', attachBus)

app.use('*', fxResponder)

// Register custom effects (must be after fxResponder)
app.use('*', registerEffects(customEffects))

app.use('*', attachDb)
app.use('*', auth)

app.get('/_/events', createSseEndpoint(config))

await mountRoutes(app, createManifestRouteLoader(routesManifest))

export default app
