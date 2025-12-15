import type { SQL } from 'drizzle-orm'
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core'
import { CommentsSection } from '@/components/CommentsSection'
import type { comments as commentsTable } from '@/db/schema'
import type { QueryHandler } from '@/honostar/server'

type CommentsTable = typeof commentsTable
type OrderByColumn = SQLiteColumn | SQL
type OrderByFn = (column: OrderByColumn) => SQL

export const issueCommentsQuery: QueryHandler = async ({ c, match, topic }) => {
  const idStr = match?.groups?.id ?? match?.[1]
  const issueId = Number(idStr)
  if (!Number.isFinite(issueId) || issueId <= 0) {
    console.warn(`[CQRS] Ignoring invalid comments topic: ${topic}`)
    return
  }

  const updatedComments = await c.var.db.query.comments.findMany({
    where: (
      comments: CommentsTable['_']['columns'],
      { eq }: { eq: (column: OrderByColumn, value: number) => SQL }
    ) => eq(comments.issueId, issueId),
    with: { author: true },
    orderBy: (comments: CommentsTable['_']['columns'], { asc }: { asc: OrderByFn }) => [
      asc(comments.createdAt),
    ],
  })

  return [['patch-elements', <CommentsSection comments={updatedComments} />]]
}
