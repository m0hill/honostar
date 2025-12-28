import { like } from 'drizzle-orm'
import { z } from 'zod'
import IssuesList from '@/components/IssuesList'
import { createHandler } from '@/honostar/server'

const searchSchema = z.object({
  search: z.string().optional().default(''),
  status: z.enum(['open', 'closed', 'all']).optional().default('open'),
})

export const GET = createHandler({
  schema: searchSchema,

  async handler(c, data) {
    const searchQuery = data.search.trim()
    const status = data.status

    if (!searchQuery) {
      // Return filtered issues if no search query
      const allIssues = await c.var.db.query.issues.findMany({
        with: {
          author: true,
        },
        ...(status !== 'all' && {
          where: (i, { eq }) => eq(i.status, status),
        }),
        orderBy: (issues, { desc }) => [desc(issues.createdAt)],
      })
      return c.var.fx.reply([
        ['patch-elements', <IssuesList issues={allIssues} />, { selector: '#issues-list' }],
      ])
    }

    // Search issues by title
    const searchResults = await c.var.db.query.issues.findMany({
      where: (i, { and, eq }) =>
        and(
          like(i.title, `%${searchQuery}%`),
          ...(status === 'all' ? [] : [eq(i.status, status)])
        ),
      with: {
        author: true,
      },
      orderBy: (issues, { desc }) => [desc(issues.createdAt)],
    })

    return c.var.fx.reply([
      ['patch-elements', <IssuesList issues={searchResults} />, { selector: '#issues-list' }],
    ])
  },
})
