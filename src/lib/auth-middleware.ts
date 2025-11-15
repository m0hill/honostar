import { factory } from '@/honostar/server'

export const requireAuth = factory.createMiddleware(async (c, next) => {
  if (!c.var.user) {
    return c.redirect('/login')
  }
  return await next()
})

export const requireGuest = factory.createMiddleware(async (c, next) => {
  if (c.var.user) {
    return c.redirect('/profile')
  }
  return await next()
})
