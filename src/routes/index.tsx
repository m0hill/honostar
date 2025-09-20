import IndexPage from '@/components/pages/IndexPage'
import type { AppHandler } from '@/core'

export const GET: AppHandler = c => {
  return c.render(<IndexPage user={c.var.user} />)
}
