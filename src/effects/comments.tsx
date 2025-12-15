import type { SQL } from 'drizzle-orm'
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core'
import { CommentsSection } from '@/components/CommentsSection'
import type { comments as commentsTable } from '@/db/schema'
import type { EffectHandler } from '@/honostar/server'
import { topics } from '@/lib/topics'

type CommentsTable = typeof commentsTable
type OrderByColumn = SQLiteColumn | SQL
type OrderByFn = (column: OrderByColumn) => SQL

export const commentCreatedSuccess: EffectHandler<[issueId: number, commentCount: number]> = async (
  c,
  issueId,
  commentCount
) => {
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

  await c.var.fx.broadcast(topics.issue(issueId).comments(), [
    ['patch-elements', <CommentsSection comments={updatedComments} />],
  ])

  await c.var.fx.reply([
    ['patch-signals', { commentError: '', comment: '' }],
    ['toast:show', `Comment posted! (${commentCount} total)`, 'success'],
  ])
}

export const commentEffects = {
  'comment:created-success': commentCreatedSuccess,
} as const
