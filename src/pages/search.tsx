import { like } from 'drizzle-orm'
import IssuesList from '@/components/IssuesList'
import { createHandler } from '@/core/page'
import { issues } from '@/db/schema'

export const GET = createHandler({
  async handler(c) {
    // Read Datastar signals from query parameter
    const datastarParam = c.req.query('datastar')
    let searchQuery = ''

    if (datastarParam) {
      try {
        const signals = JSON.parse(datastarParam)
        searchQuery = (signals?.search ?? '').trim()
      } catch (error) {
        console.error('Failed to parse datastar signals:', error)
      }
    }

    if (!searchQuery) {
      // Return all issues if no search query
      const allIssues = await c.var.db.query.issues.findMany({
        with: {
          author: true,
        },
        orderBy: (issues, { desc }) => [desc(issues.createdAt)],
      })
      return c.var.datastar.reply([
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

    return c.var.datastar.reply([
      ['patch-elements', <IssuesList issues={searchResults} />, { selector: '#issues-list' }],
    ])
  },
})
