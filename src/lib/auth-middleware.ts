import { factory } from '@/core'

export const requireAuth = factory.createMiddleware(async (c, next) => {
  if (!c.var.user) {
    if (c.req.header('Datastar-Request')) {
      return c.var.datastar.reply([['execute-script', `window.location.pathname = '/login'`]])
    }
    return c.redirect('/login')
  }
  return await next()
})

export const requireGuest = factory.createMiddleware(async (c, next) => {
  if (c.var.user) {
    if (c.req.header('Datastar-Request')) {
      return c.var.datastar.reply([['execute-script', `window.location.pathname = '/profile'`]])
    }
    return c.redirect('/profile')
  }
  return await next()
})
