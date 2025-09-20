import { deleteCookie } from 'hono/cookie'
import type { AppHandler } from '@/core'

export const POST: AppHandler = async c => {
  deleteCookie(c, 'token', { path: '/' })
  return c.redirect('/login')
}
