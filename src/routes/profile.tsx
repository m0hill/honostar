import ProfilePage from '@/components/pages/ProfilePage'
import type { AppHandler } from '@/core'

export const GET: AppHandler = c => {
  const user = c.var.user
  if (!user) {
    return c.redirect('/login')
  }
  return c.render(<ProfilePage user={user} />)
}
