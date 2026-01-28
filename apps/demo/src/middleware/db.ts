import { factory } from '@honostar/core/server'
import { db } from '@/db'

export const attachDb = factory.createMiddleware(async (c, next) => {
  c.set('db', db)
  await next()
})
