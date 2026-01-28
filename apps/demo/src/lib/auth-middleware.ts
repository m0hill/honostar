import { factory } from '@honostar/core/server'
import { routes } from '@/routes'

export const requireAuth = factory.createMiddleware(async (c, next) => {
  if (!c.var.user) {
    return c.redirect(routes.auth.login.href())
  }
  return await next()
})

export const requireGuest = factory.createMiddleware(async (c, next) => {
  if (c.var.user) {
    return c.redirect(routes.auth.profile.href())
  }
  return await next()
})
