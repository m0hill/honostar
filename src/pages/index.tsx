import IndexPage from '@/components/pages/IndexPage'
import { createPage } from '@/core/page'
import { labels } from '@/db/schema'

export default createPage({
  topics: ['issues:list'],

  async loader(c) {
    const user = c.var.user
    const issues = await c.var.db.query.issues.findMany({
      with: {
        author: true,
      },
      orderBy: (issues, { desc }) => [desc(issues.createdAt)],
    })
    const allLabels = await c.var.db.select().from(labels)
    return { user, issues, labels: allLabels }
  },

  component: IndexPage,
})
