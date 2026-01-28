import type { QueryHandler } from '@honostar/core/server'
import { defineQueryPage } from '@honostar/core/server'
import IssuesList from '@/components/IssuesList'
import LabelsSection from '@/components/LabelsSection'
import { ModeToggle } from '@/components/ModeToggle'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { labels } from '@/db/schema'
import { topics } from '@/lib/topics'
import { routes } from '@/routes'
import type { IssueWithAuthor, User } from '@/types'

type IssueStatusFilter = 'open' | 'closed' | 'all'

function resolveStatusFilter(raw: string | undefined | null): IssueStatusFilter {
  if (raw === 'closed' || raw === 'all') return raw
  return 'open'
}

function withQuery(path: string, query: Record<string, string | undefined>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, value)
  }
  const qs = params.toString()
  return qs ? `${path}?${qs}` : path
}

const issuesListQuery: QueryHandler = async ({ c }) => {
  const status = resolveStatusFilter(c.req.query('status'))
  const issues = await c.var.db.query.issues.findMany({
    with: {
      author: true,
    },
    ...(status !== 'all' && {
      where: (i, { eq }) => eq(i.status, status),
    }),
    orderBy: (issues, { desc }) => [desc(issues.createdAt)],
  })
  return [['patch-elements', <IssuesList issues={issues} />]]
}

const labelsListQuery: QueryHandler = async ({ c }) => {
  const allLabels = await c.var.db.select().from(labels)
  return [['patch-elements', <LabelsSection labels={allLabels} />]]
}

function IndexPage({
  user,
  issues,
  status,
}: {
  user: User | null
  issues: IssueWithAuthor[]
  status: IssueStatusFilter
}) {
  const searchInputProps = {
    'data-on:input__debounce.200ms': `@get('${withQuery(routes.search.href(), { status })}')`,
  }
  const openHref = routes.home.href()
  const closedHref = withQuery(routes.home.href(), { status: 'closed' })
  const allHref = withQuery(routes.home.href(), { status: 'all' })

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
        </CardContent>
      </Card>

      <div class="mt-8 max-w-4xl w-full flex gap-6" data-signals="{search: '', searching: false}">
        <aside class="w-56 shrink-0">
          <Card class="p-4">
            <div class="text-sm font-semibold mb-3">Status</div>
            <nav class="flex flex-col gap-1">
              <a
                href={openHref}
                aria-current={status === 'open' ? 'page' : undefined}
                class={[
                  'rounded-md px-2 py-1 text-sm',
                  status === 'open' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
                ].join(' ')}
              >
                Open
              </a>
              <a
                href={closedHref}
                aria-current={status === 'closed' ? 'page' : undefined}
                class={[
                  'rounded-md px-2 py-1 text-sm',
                  status === 'closed' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
                ].join(' ')}
              >
                Closed
              </a>
              <a
                href={allHref}
                aria-current={status === 'all' ? 'page' : undefined}
                class={[
                  'rounded-md px-2 py-1 text-sm',
                  status === 'all' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
                ].join(' ')}
              >
                All
              </a>
            </nav>
          </Card>
        </aside>

        <div class="flex-1 min-w-0">
          <div class="flex justify-between items-center mb-4 gap-4">
            <h2 class="text-3xl font-bold">Issues</h2>
            <div class="flex-1 max-w-sm relative">
              <Input
                type="text"
                placeholder={`Search ${status} issues...`}
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
              <Button asChild>
                <a
                  href={routes.issues.new.href()}
                  data-on:click__prevent={`@get('${routes.issues.newModal.href()}')`}
                >
                  Create Issue
                </a>
              </Button>
            )}
          </div>
          <IssuesList issues={issues} />
        </div>
      </div>
    </div>
  )
}

export default defineQueryPage({
  queries: [
    [topics.issues.list(), issuesListQuery],
    [topics.labels.list(), labelsListQuery],
  ],
  sseParams: c => ({ status: String(resolveStatusFilter(c.req.query('status'))) }),
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
    const status = resolveStatusFilter(c.req.query('status'))
    const issues = await c.var.db.query.issues.findMany({
      with: {
        author: true,
      },
      ...(status !== 'all' && {
        where: (i, { eq }) => eq(i.status, status),
      }),
      orderBy: (issues, { desc }) => [desc(issues.createdAt)],
    })
    return { user, issues, status }
  },

  component: IndexPage,
})
