import { getCookie, setCookie } from 'hono/cookie'
import { createFactory } from 'hono/factory'
import type { AppEnv } from '@/core/context'
import { bus } from '@/core/datastar/bus'
import { db } from '@/db'

export const factory = createFactory<AppEnv>()

export const initContext = factory.createMiddleware(async (c, next) => {
  let clientId = getCookie(c, 'cid')
  if (!clientId) {
    clientId = crypto.randomUUID()
    setCookie(c, 'cid', clientId, { path: '/', httpOnly: true, sameSite: 'Lax' })
  }

  c.set('db', db)
  c.set('bus', bus)
  c.set('clientId', clientId)

  await next()
})
