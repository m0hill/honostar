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
      <div class="mt-6 p-4 bg-gray-700/50 rounded-lg text-center">
        <a href="/login" class="text-cyan-400 hover:underline">
          Log in
        </a>
        <span class="text-gray-400"> to post a comment.</span>
      </div>
    )
  }

  return (
    <form
      class="mt-6"
      data-on-submit__prevent={`@post('/issues/${issueId}/comments'); $comment = ''`}
      data-signals={`{ "comment": "" }`}
    >
      <textarea
        data-bind="comment"
        class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md placeholder-gray-400 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
        placeholder="Leave a comment..."
        rows={4}
        required
      ></textarea>
      <div class="flex justify-end mt-2">
        <button
          type="submit"
          class="py-2 px-6 bg-green-600 hover:bg-green-700 rounded-md font-semibold transition-colors"
        >
          Comment
        </button>
      </div>
    </form>
  )
}

export function CommentsSection({ comments }: { comments: CommentWithAuthor[] }) {
  return (
    <div id="comments-section" class="mt-8 space-y-4">
      {comments.map(comment => (
        <div key={comment.id} class="bg-gray-700/50 rounded-lg p-4">
          <p class="text-gray-300 whitespace-pre-wrap">{comment.body}</p>
          <p class="text-xs text-gray-400 mt-2 font-semibold">
            {comment.author.username} commented on {formatDate(comment.createdAt)}
          </p>
        </div>
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
    <div class="min-h-screen bg-gray-900 text-white flex flex-col items-center pt-10">
      <div class="max-w-4xl w-full p-8">
        <div class="mb-6">
          <a
            href="/"
            data-on-click__prevent="@get('/')"
            class="text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            &larr; Back to Issues
          </a>
        </div>

        <div class="bg-gray-800 rounded-lg shadow-lg">
          <div class="p-6 border-b border-gray-700">
            <h1 class="text-3xl font-bold text-white">{issue.title}</h1>
            <p class="mt-2 text-sm text-gray-400">
              Opened by <span class="font-semibold">{issue.author.username}</span> on{' '}
              {formatDate(issue.createdAt)}
            </p>
          </div>

          <div class="p-6">
            {issue.description && (
              <p class="text-gray-300 whitespace-pre-wrap">{issue.description}</p>
            )}

            {issue.imageUrl && (
              <div class="mt-6">
                <img src={issue.imageUrl} alt="Issue image" class="max-w-full h-auto rounded-md" />
              </div>
            )}

            <div class="mt-6">
              <h3 class="text-lg font-semibold text-gray-200 mb-2">Labels</h3>
              <div class="flex flex-wrap gap-2">
                {issue.labels.length > 0 ? (
                  issue.labels.map(label => (
                    <span
                      key={label.id}
                      class="px-2 py-1 text-sm font-medium bg-gray-700 text-gray-300 rounded-full"
                    >
                      {label.name}
                    </span>
                  ))
                ) : (
                  <p class="text-sm text-gray-400">No labels attached.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <h2 class="mt-8 text-xl font-bold text-gray-100">Comments</h2>
        <CommentsSection comments={issue.comments} />
        <CommentForm issueId={issue.id} user={user} />
      </div>
    </div>
  )
}
