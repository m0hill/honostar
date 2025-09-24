import { z } from 'zod'
import { CommentsSection } from '@/components/pages/IssueDetailPage'
import { createHandler } from '@/core/page'
import { comments } from '@/db/schema'
import { requireAuth } from '@/lib/auth-middleware'
import { topics } from '@/lib/topics'

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
      return c.var.datastar.reply([['execute-script', `alert('${error}')`]], {
        status: 400,
      })
    }

    await c.var.db.insert(comments).values({
      body: validation.data.comment,
      issueId,
      authorId: user.id,
    })

    const updatedComments = await c.var.db.query.comments.findMany({
      where: (co, { eq }) => eq(co.issueId, issueId),
      with: { author: true },
      orderBy: (co, { asc }) => [asc(co.createdAt)],
    })

    return c.var.datastar.broadcast(
      topics.issue(issueId).comments(),
      [
        [
          'patch-elements',
          <CommentsSection comments={updatedComments} />,
          { selector: '#comments-section' },
        ],
      ],
      { status: 201 }
    )
  },
})
