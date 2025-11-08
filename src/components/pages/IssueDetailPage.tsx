import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { routes } from '@/routes'
import type { CommentWithAuthor, IssueWithDetails, User } from '@/types'

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

export function CommentsSection({ comments }: { comments: CommentWithAuthor[] }) {
  return (
    <div id="comments-section" class="mt-8 space-y-4">
      {comments.map(comment => (
        <Card key={comment.id} class="gap-0">
          <CardContent class="pt-6">
            <p class="whitespace-pre-wrap">{comment.body}</p>
            <p class="text-xs text-muted-foreground mt-2 font-semibold">
              {comment.author.username} commented on {formatDate(comment.createdAt)}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function IssueDetailPage({
  issue,
  user,
}: {
  issue: IssueWithDetails
  user: User | null
}) {
  return (
    <div class="min-h-screen bg-background text-foreground flex flex-col items-center pt-10 px-4">
      <div class="max-w-4xl w-full">
        <div class="mb-6">
          <Button asChild variant="link" class="p-0 h-auto">
            <a href={routes.home.href()}>&larr; Back to Issues</a>
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

        <h2 class="mt-8 text-xl font-bold">Comments</h2>
        <CommentsSection comments={issue.comments} />
        <CommentForm issueId={issue.id} user={user} />
      </div>
    </div>
  )
}
