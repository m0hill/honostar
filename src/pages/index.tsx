import IssuesList from '@/components/IssuesList'
import { ModeToggle } from '@/components/ModeToggle'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { labels } from '@/db/schema'
import { createPage } from '@/honostar/server'
import { topics } from '@/lib/topics'
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
  const searchInputProps = {
    'data-on:input__debounce.200ms': `@get('${routes.search.href()}')`,
  }
  return (
    <div class="min-h-screen bg-background text-foreground flex flex-col items-center pt-10 px-4">
      <div class="w-full max-w-4xl flex justify-end mb-4">
        <ModeToggle />
      </div>
      <Card class="text-center max-w-4xl w-full">
        <CardHeader>
          <CardTitle class="text-5xl">GitHub Issues Clone</CardTitle>
          <CardDescription class="text-lg mt-4">
            A simple, reactive issue tracker built with Honostar and Datastar.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
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
          <div class="pt-4 border-t">
            <Button asChild variant="outline" size="sm">
              <a href={routes.inspectorDemo.href()}>🔍 Inspector Demo (Test Signals)</a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div class="mt-8 max-w-4xl w-full" data-signals="{search: '', searching: false}">
        <div class="flex justify-between items-center mb-4 gap-4">
          <h2 class="text-3xl font-bold">Issues</h2>
          <div class="flex-1 max-w-sm relative">
            <Input
              type="text"
              placeholder="Search issues..."
              data-bind="search"
              data-indicator="searching"
              {...searchInputProps}
            />
            <div
              class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
              data-show="$searching"
              style="display:none"
            >
              <svg
                class="animate-spin h-4 w-4 text-muted-foreground"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          </div>
          {user && (
            <Button data-on:click={`@get('${routes.issues.new.href()}')`}>Create Issue</Button>
          )}
        </div>
        <IssuesList issues={issues} />
      </div>
    </div>
  )
}

export default createPage({
  topics: [topics.issues.list(), topics.labels.list()],
  head: {
    title: 'Issues • Honostar',
    elements: [
      <meta
        name="description"
        content="A reactive issue tracker built with Honostar and Datastar."
      />,
    ],
  },

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
