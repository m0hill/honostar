import IndexPage from '@/components/pages/IndexPage'
import type { AppHandler } from '@/core'

export const GET: AppHandler = async c => {
  const issues = await c.var.db.query.issues.findMany({
    with: {
      author: true,
    },
    orderBy: (issues, { desc }) => [desc(issues.createdAt)],
  })

  const indexPage = <IndexPage user={c.var.user} issues={issues} />

  if (c.req.header('Datastar-Request')) {
    return c.var.datastar.respond({
      effects: [
        ['patch-elements', indexPage, { selector: 'body', mode: 'inner' }],
        ['execute-script', `history.pushState({}, '', '/')`],
      ],
    })
  }

  return c.render(indexPage)
}
