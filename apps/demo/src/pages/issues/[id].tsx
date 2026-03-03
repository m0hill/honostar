import { defineQueryPage, patchRegion, regionAttrs, type QueryHandler } from "@honostar/core/server"
import { z } from "zod"
import { CommentsSection } from "@/components/CommentsSection"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { topics } from "@/lib/topics"
import { routes } from "@/generated/routes"
import type { IssueWithDetails, User } from "@/types"

const paramSchema = z.object({
  id: z.coerce.number().int().positive(),
})

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date)

async function fetchIssueWithDetails(c: Parameters<QueryHandler>[0]["c"], issueId: number) {
  const issueData = await c.var.db.query.issues.findFirst({
    where: (i, { eq }) => eq(i.id, issueId),
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

  if (!issueData) return null

  const issue: IssueWithDetails = {
    ...issueData,
    labels: issueData.issuesToLabels.map((itl) => itl.label),
    comments: issueData.comments,
  }

  return issue
}

const issueDetailQuery: QueryHandler = async ({ c, match, topic }) => {
  const idStr = match?.groups?.id ?? match?.[1]
  const issueId = Number(idStr)
  if (!Number.isFinite(issueId) || issueId <= 0) {
    console.warn(`[CQRS] Ignoring invalid issue detail topic: ${topic}`)
    return
  }

  const issue = await fetchIssueWithDetails(c, issueId)
  if (!issue) return
  return [patchRegion(topic, <IssueDetailCard issue={issue} />)]
}

const issueCommentsQuery: QueryHandler = async ({ c, match, topic }) => {
  const idStr = match?.groups?.id ?? match?.[1]
  const issueId = Number(idStr)
  if (!Number.isFinite(issueId) || issueId <= 0) {
    console.warn(`[CQRS] Ignoring invalid comments topic: ${topic}`)
    return
  }

  const updatedComments = await c.var.db.query.comments.findMany({
    where: (comments, { eq }) => eq(comments.issueId, issueId),
    with: { author: true },
    orderBy: (comments, { asc }) => [asc(comments.createdAt)],
  })

  return [patchRegion(topic, <CommentsSection comments={updatedComments} regionId={topic} />)]
}

function IssueDetailCard({ issue }: { issue: IssueWithDetails }) {
  const issueUrl = routes.issues.show.href({ id: issue.id })
  const toggleTargetStatus = issue.status === "open" ? "closed" : "open"
  const toggleLabel = issue.status === "open" ? "Close issue" : "Reopen issue"

  return (
    <Card {...regionAttrs(`issue:${issue.id}:detail`)}>
      <CardHeader class="border-b">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <CardTitle class="text-3xl flex items-center gap-3">
              <span class="truncate">{issue.title}</span>
              <Badge variant={issue.status === "open" ? "secondary" : "outline"}>
                {issue.status}
              </Badge>
            </CardTitle>
            <CardDescription>
              Opened by <span class="font-semibold">{issue.author.username}</span> on{" "}
              {formatDate(issue.createdAt)}
            </CardDescription>
          </div>

          <form
            action={routes.issues.status.href({ id: String(issue.id) })}
            method="post"
            class="shrink-0"
            data-indicator="togglingIssueStatus"
            data-on:submit__prevent={`@post('${routes.issues.status.href({ id: String(issue.id) })}', { contentType: 'form', openWhenHidden: true })`}
          >
            <input type="hidden" name="status" value={toggleTargetStatus} />
            <Button
              type="submit"
              variant={issue.status === "open" ? "outline" : "default"}
              data-attr:disabled="$togglingIssueStatus"
            >
              <span data-show="!$togglingIssueStatus" style="display:none">
                {toggleLabel}
              </span>
              <span data-show="$togglingIssueStatus" style="display:none">
                Saving...
              </span>
            </Button>
          </form>
        </div>
      </CardHeader>

      <CardContent>
        <div class="mt-4">
          {/* Share button using clipboard plugin */}
          <Button
            variant="outline"
            size="sm"
            data-signals={JSON.stringify({ copied: false })}
            data-on:click={`@clipboard(window.location.origin + '${issueUrl}'); $copied = true; setTimeout(() => $copied = false, 2000)`}
          >
            <span data-show="!$copied" style="display:none">
              Share Link
            </span>
            <span data-show="$copied" style="display:none">
              ✓ Copied!
            </span>
          </Button>
        </div>

        {issue.description && <p class="mt-6 whitespace-pre-wrap">{issue.description}</p>}

        {issue.imageUrl && (
          <div class="mt-6">
            <img src={issue.imageUrl} alt="Issue image" class="max-w-full h-auto rounded-md" />
          </div>
        )}

        <div class="mt-6">
          <h3 class="text-lg font-semibold mb-2">Labels</h3>
          <div class="flex flex-wrap gap-2">
            {issue.labels.length > 0 ? (
              issue.labels.map((label) => (
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
  )
}

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
      action={routes.issues.comments.href({ id: String(issueId) })}
      method="post"
      data-on:submit__prevent={`$commentError = ''; @post('${routes.issues.comments.href({ id: String(issueId) })}', {openWhenHidden: true});
         $comment = ''`}
      data-indicator="commenting"
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

      <Textarea
        data-bind="comment"
        name="comment"
        placeholder="Leave a comment..."
        rows={4}
        required
      />
      <div class="flex justify-end mt-2">
        <Button type="submit" data-attr:disabled="$commenting">
          <span data-show="!$commenting" style="display:none">
            Comment
          </span>
          <span data-show="$commenting" style="display:none">
            Commenting...
          </span>
        </Button>
      </div>
    </form>
  )
}

function IssueDetailPage({
  issue,
  user,
  commentError,
}: {
  issue: IssueWithDetails
  user: User | null
  commentError?: string
}) {
  return (
    <div class="min-h-screen bg-background text-foreground flex flex-col items-center pt-10 px-4">
      <div class="max-w-4xl w-full">
        <div class="mb-6 flex items-center justify-between">
          <Button asChild variant="link" class="p-0 h-auto">
            <a href={routes.home.href()}>&larr; Back to Issues</a>
          </Button>
        </div>

        <IssueDetailCard issue={issue} />

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
          <CommentsSection comments={issue.comments} regionId={`issue:${issue.id}:comments`} />
        </div>

        <div id="comment-form">
          {commentError ? (
            <div
              class="mt-6 p-3 bg-destructive/10 border border-destructive rounded-md text-destructive text-sm"
              role="alert"
            >
              {commentError}
            </div>
          ) : null}
          <CommentForm issueId={issue.id} user={user} />
        </div>
      </div>
    </div>
  )
}

export default defineQueryPage({
  topics: (c) => [
    topics.issue(c.req.param("id")).detail(),
    topics.issue(c.req.param("id")).comments(),
  ],
  queries: [
    [/^issue:(?<id>\d+):detail$/, issueDetailQuery],
    [/^issue:(?<id>\d+):comments$/, issueCommentsQuery],
  ],
  head: ({ issue }) => ({
    title: `${issue.title} • Honostar`,
    elements: [
      <meta property="og:title" content={issue.title} />,
      <meta property="og:type" content="article" />,
    ],
  }),

  async loader(c) {
    const paramValidation = paramSchema.safeParse(c.req.param())
    if (!paramValidation.success) {
      return c.text("Invalid issue ID", 400)
    }
    const { id } = paramValidation.data

    const issue = await fetchIssueWithDetails(c, id)
    if (!issue) {
      return c.text("Issue not found", 404)
    }

    const commentError = c.req.query("commentError")
    return commentError ? { issue, user: c.var.user, commentError } : { issue, user: c.var.user }
  },

  component: IssueDetailPage,
})
