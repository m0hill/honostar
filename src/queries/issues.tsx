import type { SQL } from 'drizzle-orm'
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core'
import IssuesList from '@/components/IssuesList'
import type { issues as issuesTable } from '@/db/schema'
import type { QueryHandler } from '@/honostar/server'

type IssuesTable = typeof issuesTable
type OrderByColumn = SQLiteColumn | SQL
type OrderByFn = (column: OrderByColumn) => SQL

export const issuesListQuery: QueryHandler = async ({ c }) => {
  const allIssues = await c.var.db.query.issues.findMany({
    with: { author: true },
    orderBy: (issues: IssuesTable['_']['columns'], { desc }: { desc: OrderByFn }) => [
      desc(issues.createdAt),
    ],
  })

  return [['patch-elements', <IssuesList issues={allIssues} />]]
}
