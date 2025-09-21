import { deleteCookie } from 'hono/cookie'
import LoginPage from '@/components/pages/LoginPage'
import type { AppHandler } from '@/core'

export const POST: AppHandler = async c => {
  deleteCookie(c, 'token', { path: '/' })

  const loginPage = <LoginPage />
  return c.var.datastar.respond({
    effects: [
      ['patch-elements', loginPage, { selector: 'body', mode: 'inner' }],
      ['execute-script', `history.pushState({}, '', '/login')`],
    ],
  })
}
