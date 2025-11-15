import { createFactory } from 'hono/factory'
import type { AppEnv } from '@/honostar/server/context'

export const factory = createFactory<AppEnv>()

export const initContext = factory.createMiddleware(async (c, next) => {
  c.set('clientId', c.req.header('X-Tab-ID') ?? 'anonymous')
  await next()
})
