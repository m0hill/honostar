import type { SQL } from 'drizzle-orm'
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core'
import IssuesList from '@/components/IssuesList'
import type { issues as issuesTable } from '@/db/schema'
import type { EffectHandler } from '@/honostar/server'
import { topics } from '@/lib/topics'
import type { Issue } from '@/types'

type IssuesTable = typeof issuesTable
type OrderByColumn = SQLiteColumn | SQL
type OrderByFn = (column: OrderByColumn) => SQL

export const issueCreatedSuccess: EffectHandler<[issue: Issue]> = async (c, issue) => {
  const allIssues = await c.var.db.query.issues.findMany({
    with: { author: true },
    orderBy: (issues: IssuesTable['_']['columns'], { desc }: { desc: OrderByFn }) => [
      desc(issues.createdAt),
    ],
  })

  await c.var.fx.broadcast(topics.issues.list(), [
    ['patch-elements', <IssuesList issues={allIssues} />],
  ])

  await c.var.fx.reply([
    ['toast:show', `Issue "${issue.title}" created successfully!`, 'success'],
    [
      'patch-elements',
      '',
      {
        selector: '#ds-overlays [data-modal-id="create-issue"]',
        mode: 'remove',
      },
    ],
    [
      'patch-signals',
      {
        issue: {
          title: '',
          description: '',
          labels: [],
          newLabel: '',
          image: null,
        },
      },
    ],
  ])
}

export const issueEffects = {
  'issue:created-success': issueCreatedSuccess,
} as const
