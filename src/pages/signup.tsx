import { SignupPage } from '@/components/pages/SignupPage'
import { createPage } from '@/core/page'
import { requireGuest } from '@/lib/auth-middleware'

export default createPage({
  use: [requireGuest],

  loader() {
    return Promise.resolve({})
  },

  component: SignupPage,
})
