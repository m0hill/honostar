import { deleteCookie } from 'hono/cookie'
import { createHandler } from '@/core'
import { routes } from '@/routes'

export const POST = createHandler({
  async handler(c) {
    deleteCookie(c, 'token', { path: '/' })
    return c.redirect(routes.auth.login.href(), 303)
  },
})
