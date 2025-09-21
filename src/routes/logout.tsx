import { deleteCookie } from 'hono/cookie'
import LoginPage from '@/components/pages/LoginPage'
import type { AppHandler } from '@/core'

export const POST: AppHandler = async c => {
  deleteCookie(c, 'token', { path: '/' })

  const loginPage = <LoginPage />
  return c.var.datastar.respond({
    effects: [
      ['patch-signals', { auth: null }],
      ['patch-elements', loginPage, { selector: '#app', mode: 'outer' }],
      ['execute-script', `history.pushState({}, '', '/login')`],
    ],
  })
}
