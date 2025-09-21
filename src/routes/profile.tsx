import LoginPage from '@/components/pages/LoginPage'
import ProfilePage from '@/components/pages/ProfilePage'
import type { AppHandler } from '@/core'

export const GET: AppHandler = c => {
  const user = c.var.user
  if (!user) {
    const loginPage = <LoginPage />
    if (c.req.header('Datastar-Request')) {
      return c.var.datastar.respond({
        effects: [
          ['patch-elements', loginPage, { selector: 'body', mode: 'inner' }],
          ['execute-script', `history.pushState({}, '', '/login')`],
        ],
      })
    }
    return c.redirect('/login')
  }

  const profilePage = <ProfilePage user={user} />
  if (c.req.header('Datastar-Request')) {
    return c.var.datastar.respond({
      effects: [
        ['patch-elements', profilePage, { selector: 'body', mode: 'inner' }],
        ['execute-script', `history.pushState({}, '', '/profile')`],
      ],
    })
  }

  return c.render(profilePage)
}
