import { Card, CardContent } from "@/components/ui/card"
import type { CommentWithAuthor } from "@/types"
import { regionAttrs } from "@honostar/core/server"

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date)

export function CommentsSection({
  comments,
  regionId,
}: {
  comments: CommentWithAuthor[]
  regionId?: string
}) {
  return (
    <div class="mt-8 space-y-4" {...(regionId ? regionAttrs(regionId) : {})}>
      {comments.map((comment) => (
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
