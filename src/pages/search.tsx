import { like } from 'drizzle-orm'
import { z } from 'zod'
import IssuesList from '@/components/IssuesList'
import { issues } from '@/db/schema'
import { createHandler } from '@/honostar/server'

const searchSchema = z.object({
  search: z.string().optional().default(''),
})

export const GET = createHandler({
  schema: searchSchema,

  async handler(c, data) {
    const searchQuery = data.search.trim()

    if (!searchQuery) {
      // Return all issues if no search query
      const allIssues = await c.var.db.query.issues.findMany({
        with: {
          author: true,
        },
        orderBy: (issues, { desc }) => [desc(issues.createdAt)],
      })
      return c.var.fx.reply([
        ['patch-elements', <IssuesList issues={allIssues} />, { selector: '#issues-list' }],
      ])
    }

    // Search issues by title
    const searchResults = await c.var.db.query.issues.findMany({
      where: like(issues.title, `%${searchQuery}%`),
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
