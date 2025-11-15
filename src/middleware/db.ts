import { db } from '@/db'
import { factory } from '@/honostar/server/middleware'

export const attachDb = factory.createMiddleware(async (c, next) => {
  c.set('db', db)
  await next()
})
