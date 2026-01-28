import { Card, CardContent } from '@/components/ui/card'
import type { CommentWithAuthor } from '@/types'

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)

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
