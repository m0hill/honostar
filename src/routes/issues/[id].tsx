import { z } from 'zod'
import IssueDetailPage from '@/components/pages/IssueDetailPage'
import type { AppHandler } from '@/core'
import type { IssueWithDetails } from '@/types'

const paramSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const GET: AppHandler = async c => {
  const paramValidation = paramSchema.safeParse(c.req.param())
  if (!paramValidation.success) {
    return c.text('Invalid issue ID', 400)
  }
  const { id } = paramValidation.data

  const issueData = await c.var.db.query.issues.findFirst({
    where: (i, { eq }) => eq(i.id, id),
    with: {
      author: true,
      issuesToLabels: {
        with: {
          label: true,
        },
      },
      comments: {
        with: {
          author: true,
        },
        orderBy: (c, { asc }) => [asc(c.createdAt)],
      },
    },
  })

  if (!issueData) {
    return c.text('Issue not found', 404)
  }

  const issue: IssueWithDetails = {
    ...issueData,
    labels: issueData.issuesToLabels.map(itl => itl.label),
    comments: issueData.comments,
  }

  const issuePage = <IssueDetailPage issue={issue} />

  if (c.req.header('Datastar-Request')) {
    return c.var.datastar.respond({
      effects: [['navigate', issuePage, `/issues/${id}`]],
    })
  }

  return c.render(issuePage)
}
