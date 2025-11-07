import { deleteCookie } from 'hono/cookie'
import { createHandler } from '@/core/page'

export const POST = createHandler({
  async handler(c) {
    deleteCookie(c, 'token', { path: '/' })
    return c.redirect('/login', 303)
  },
})
