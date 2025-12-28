import type { SQL } from 'drizzle-orm'
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core'
import { z } from 'zod'
import { comments as commentsTable } from '@/db/schema'
import { defineCommand } from '@/honostar/server'
import { requireAuth } from '@/lib/auth-middleware'
import { topics } from '@/lib/topics'
import { routes } from '@/routes'

// Drizzle ORM query builder types
type CommentsTable = typeof commentsTable
type OrderByColumn = SQLiteColumn | SQL

const bodySchema = z.object({
  comment: z.string().trim().min(1, 'Comment cannot be empty.'),
})

export const POST = defineCommand({
  schema: bodySchema,
  use: [requireAuth],
  hook: (result, c) => {
    const error = result.error[0]?.message || 'Invalid comment'
    if (c.req.header('datastar-request') !== null) {
      return c.var.fx.reply([['patch-signals', { commentError: error }]], {
        status: 400,
      })
    }
    const { id } = c.req.param()
    return c.redirect(
      `${routes.issues.show.href({ id: Number(id) })}?commentError=${encodeURIComponent(error)}#comment-form`,
      303
    )
  },

  async handler(c, data) {
    const { id } = c.req.param()
    const issueId = Number(id)
    const user = c.var.user!

    await c.var.db.insert(commentsTable).values({
      body: data.comment,
      issueId,
      authorId: user.id,
    })

    const commentCount = await c.var.db.query.comments.findMany({
      where: (
        comments: CommentsTable['_']['columns'],
        { eq }: { eq: (column: OrderByColumn, value: number) => SQL }
      ) => eq(comments.issueId, issueId),
    })

    // CQRS: publish domain event for query re-render + success toast
    c.var.fx.publish(topics.issue(issueId).comments(), 'comment:created', { issueId })

    if (c.req.header('datastar-request') !== null) {
      return c.var.fx.reply(
        [
          ['patch-signals', { commentError: '', comment: '' }],
          ['toast:show', `Comment posted! (${commentCount.length} total)`, 'success'],
        ],
        { status: 201 }
      )
    }
    return c.redirect(`${routes.issues.show.href({ id: issueId })}#comments`, 303)
  },
})
