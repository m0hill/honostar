import type { IssueWithDetails } from '@/types'

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)

export default function IssueDetailPage({ issue }: { issue: IssueWithDetails }) {
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
      </div>
    </div>
  )
}
