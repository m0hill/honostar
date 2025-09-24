import { createFactory } from 'hono/factory'
import type { AppEnv } from '@/core/context'
import { bus } from '@/core/datastar/bus'
import { db } from '@/db'

export const factory = createFactory<AppEnv>()

export const initContext = factory.createMiddleware(async (c, next) => {
  c.set('db', db)
  c.set('bus', bus)
  c.set('clientId', c.req.header('X-Tab-ID') ?? 'anonymous')

  await next()
})
