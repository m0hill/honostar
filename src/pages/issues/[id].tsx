import { z } from 'zod'
import { CommentsSection } from '@/components/CommentsSection'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { createPage } from '@/honostar/server/page'
import { topics } from '@/lib/topics'
import { routes } from '@/routes'
import type { IssueWithDetails, User } from '@/types'

const paramSchema = z.object({
  id: z.coerce.number().int().positive(),
})

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)

function CommentForm({ issueId, user }: { issueId: number; user: User | null }) {
  if (!user) {
    return (
      <Card class="mt-6">
        <CardContent class="text-center py-6">
          <Button asChild variant="link" class="p-0 h-auto">
            <a href={routes.auth.login.href()}>Log in</a>
          </Button>
          <span class="text-muted-foreground"> to post a comment.</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <form
      class="mt-6"
      data-on:submit__prevent={`$commentError = ''; @post('${routes.issues.comments.href({ id: String(issueId) })}');
         $comment = ''`}
      data-signals={`{ "comment": "", "commentError": "" }`}
    >
      {/* Error message display */}
      <div
        data-show="$commentError"
        style="display:none"
        class="mb-3 p-3 bg-destructive/10 border border-destructive rounded-md text-destructive text-sm"
        role="alert"
      >
        <span data-text="$commentError"></span>
      </div>

      <Textarea data-bind="comment" placeholder="Leave a comment..." rows={4} required />
      <div class="flex justify-end mt-2">
        <Button type="submit">Comment</Button>
      </div>
    </form>
  )
}

function IssueDetailPage({ issue, user }: { issue: IssueWithDetails; user: User | null }) {
  const issueUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}${routes.issues.show.href({ id: issue.id })}`

  return (
    <div class="min-h-screen bg-background text-foreground flex flex-col items-center pt-10 px-4">
      <div class="max-w-4xl w-full">
        <div class="mb-6 flex items-center justify-between">
          <Button asChild variant="link" class="p-0 h-auto">
            <a href={routes.home.href()}>&larr; Back to Issues</a>
          </Button>

          {/* Share button using clipboard plugin */}
          <Button
            variant="outline"
            size="sm"
            data-signals={JSON.stringify({ copied: false })}
            data-on:click={`@clipboard('${issueUrl}'); $copied = true; setTimeout(() => $copied = false, 2000)`}
          >
            <span data-show="!$copied">Share Link</span>
            <span data-show="$copied" style="display:none">
              ✓ Copied!
            </span>
          </Button>
        </div>

        <Card>
          <CardHeader class="border-b">
            <CardTitle class="text-3xl">{issue.title}</CardTitle>
            <CardDescription>
              Opened by <span class="font-semibold">{issue.author.username}</span> on{' '}
              {formatDate(issue.createdAt)}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {issue.description && <p class="whitespace-pre-wrap">{issue.description}</p>}

            {issue.imageUrl && (
              <div class="mt-6">
                <img src={issue.imageUrl} alt="Issue image" class="max-w-full h-auto rounded-md" />
              </div>
            )}

            <div class="mt-6">
              <h3 class="text-lg font-semibold mb-2">Labels</h3>
              <div class="flex flex-wrap gap-2">
                {issue.labels.length > 0 ? (
                  issue.labels.map(label => (
                    <Badge key={label.id} variant="secondary">
                      {label.name}
                    </Badge>
                  ))
                ) : (
                  <p class="text-sm text-muted-foreground">No labels attached.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div id="comments" class="scroll-mt-20">
          <div class="mt-8 flex items-center justify-between">
            <h2 class="text-xl font-bold">Comments</h2>
            {issue.comments.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                data-on:click="@scroll('#comment-form', 'smooth', 'center')"
              >
                Add Comment
              </Button>
            )}
          </div>
          <CommentsSection comments={issue.comments} />
        </div>

        <div id="comment-form">
          <CommentForm issueId={issue.id} user={user} />
        </div>
      </div>
    </div>
  )
}

export default createPage({
  topics: c => [topics.issue(c.req.param('id')).comments()],

  async loader(c) {
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
    return { issue, user: c.var.user }
  },

  component: IssueDetailPage,
})
