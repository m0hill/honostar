import ProfilePage from '@/components/pages/ProfilePage'
import { createPage } from '@/core/page'
import { requireAuth } from '@/lib/auth-middleware'

export default createPage<{ user: import('@/types').User }>({
  use: [requireAuth],

  async loader(c) {
    const user = c.var.user!
    return { user }
  },

  component: ProfilePage,
})
