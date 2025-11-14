import type { SQL } from 'drizzle-orm'
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core'
import { z } from 'zod'
import { createHandler } from '@/core/page'
import { comments as commentsTable } from '@/db/schema'
import { requireAuth } from '@/lib/auth-middleware'

// Drizzle ORM query builder types
type CommentsTable = typeof commentsTable
type OrderByColumn = SQLiteColumn | SQL

const bodySchema = z.object({
  comment: z.string().trim().min(1, 'Comment cannot be empty.'),
})

export const POST = createHandler({
  use: [requireAuth],
  async handler(c) {
    const { id } = c.req.param()
    const issueId = Number(id)
    const user = c.var.user!
    const json = await c.req.json()

    const validation = bodySchema.safeParse(json)

    if (!validation.success) {
      const error = validation.error.issues[0]?.message || 'Invalid comment'
      return c.var.datastar.reply([['patch-signals', { commentError: error }]], {
        status: 400,
      })
    }

    await c.var.db.insert(commentsTable).values({
      body: validation.data.comment,
      issueId,
      authorId: user.id,
    })

    const commentCount = await c.var.db.query.comments.findMany({
      where: (
        comments: CommentsTable['_']['columns'],
        { eq }: { eq: (column: OrderByColumn, value: number) => SQL }
      ) => eq(comments.issueId, issueId),
    })

    // Use custom effect! Handles broadcasting + success toast
    return c.var.datastar.reply([['comment:created-success', issueId, commentCount.length]], {
      status: 201,
    })
  },
})
