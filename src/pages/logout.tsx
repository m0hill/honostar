import { deleteCookie } from 'hono/cookie'
import LoginPage from '@/components/pages/LoginPage'
import { createHandler } from '@/core/page'

export const POST = createHandler({
  async handler(c) {
    deleteCookie(c, 'token', { path: '/' })

    const loginPage = <LoginPage />
    return c.var.datastar.respond({
      toClient: true,
      effects: [
        ['patch-signals', { auth: null }],
        [
          'patch-elements',
          await c.var.renderFragmentToString(loginPage),
          { selector: '#app', mode: 'outer' },
        ],
        ['execute-script', `history.pushState({}, '', '/login')`],
      ],
    })
  },
})
