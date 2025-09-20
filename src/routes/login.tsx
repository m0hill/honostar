import LoginPage from '@/components/pages/LoginPage'
import type { AppHandler } from '@/core'

export const GET: AppHandler = c => {
  if (c.var.user) {
    return c.redirect('/profile')
  }
  return c.render(<LoginPage />)
}
