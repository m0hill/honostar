import LoginPage from '@/components/pages/LoginPage'
import ProfilePage from '@/components/pages/ProfilePage'
import type { AppHandler } from '@/core'

export const GET: AppHandler = c => {
  if (c.var.user) {
    const profilePage = <ProfilePage user={c.var.user} />
    if (c.req.header('Datastar-Request')) {
      return c.var.datastar.respond({
        effects: [
          ['patch-elements', profilePage, { selector: '#app', mode: 'outer' }],
          ['execute-script', `history.pushState({}, '', '/profile')`],
        ],
      })
    }
    return c.redirect('/profile')
  }

  const loginPage = <LoginPage />
  if (c.req.header('Datastar-Request')) {
    return c.var.datastar.respond({
      effects: [
        ['patch-elements', loginPage, { selector: '#app', mode: 'outer' }],
        ['execute-script', `history.pushState({}, '', '/login')`],
      ],
    })
  }

  return c.render(loginPage)
}
