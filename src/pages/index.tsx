import { ModeToggle } from '@/components/ModeToggle'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createPage } from '@/core/page'
import { labels } from '@/db/schema'
import { routes } from '@/routes'
import type { IssueWithAuthor, Label, User } from '@/types'

function IndexPage({
  user,
  issues,
}: {
  user: User | null
  issues: IssueWithAuthor[]
  labels: Label[]
}) {
  return (
    <div class="min-h-screen bg-background text-foreground flex flex-col items-center pt-10 px-4">
      <div class="w-full max-w-4xl flex justify-end mb-4">
        <ModeToggle />
      </div>
      <Card class="text-center max-w-4xl w-full">
        <CardHeader>
          <CardTitle class="text-5xl">GitHub Issues Clone</CardTitle>
          <CardDescription class="text-lg mt-4">
            A simple, reactive issue tracker built with Bonsai and Datastar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user ? (
            <div class="flex justify-between items-center">
              <p class="text-xl">
                Welcome back, <span class="font-bold">{user.username}</span>!
              </p>
              <Button asChild variant="default">
                <a href={routes.auth.profile.href()}>Go to Profile</a>
              </Button>
            </div>
          ) : (
            <div class="space-y-4">
              <p class="text-xl">Please log in to continue.</p>
              <Button asChild size="lg">
                <a href={routes.auth.login.href()}>Login or Sign Up</a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div class="mt-8 max-w-4xl w-full">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-3xl font-bold">Issues</h2>
          {user && <Button data-on:click="@get('/issues/new')">Create Issue</Button>}
        </div>
        <Card id="issues-list" class="gap-0 py-0">
          <ul class="divide-y divide-border">
            {issues.length > 0 ? (
              issues.map(issue => (
                <li key={issue.id}>
                  <a
                    href={routes.issues.show.href({ id: String(issue.id) })}
                    class="block p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div class="flex items-center space-x-4">
                      <div class="text-primary">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          class="h-6 w-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p class="font-semibold text-lg">{issue.title}</p>
                        <p class="text-sm text-muted-foreground">
                          #{issue.id} opened by {issue.author.username}
                        </p>
                      </div>
                    </div>
                  </a>
                </li>
              ))
            ) : (
              <li class="p-4 text-center text-muted-foreground">No issues found.</li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  )
}

export default createPage({
  topics: ['issues:list', 'labels:list'],

  async loader(c) {
    const user = c.var.user
    const issues = await c.var.db.query.issues.findMany({
      with: {
        author: true,
      },
      orderBy: (issues, { desc }) => [desc(issues.createdAt)],
    })
    const allLabels = await c.var.db.select().from(labels)
    return { user, issues, labels: allLabels }
  },

  component: IndexPage,
})
