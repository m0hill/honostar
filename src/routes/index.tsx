import IndexPage from '@/components/pages/IndexPage'
import type { AppHandler } from '@/core'
import { labels } from '@/db/schema'

export const GET: AppHandler = async c => {
  const issues = await c.var.db.query.issues.findMany({
    with: {
      author: true,
    },
    orderBy: (issues, { desc }) => [desc(issues.createdAt)],
  })

  const allLabels = await c.var.db.select().from(labels)

  const indexPage = <IndexPage user={c.var.user} issues={issues} labels={allLabels} />

  if (c.req.header('Datastar-Request')) {
    return c.var.datastar.respond({
      effects: [
        ['patch-elements', indexPage, { selector: '#app', mode: 'outer' }],
        ['execute-script', `history.pushState({}, '', '/')`],
      ],
    })
  }

  return c.render(indexPage)
}
