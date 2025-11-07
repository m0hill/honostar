import { routes } from '@/routes'
import type { IssueWithAuthor } from '@/types'

export default function IssuesList({ issues }: { issues: IssueWithAuthor[] }) {
  return (
    <div id="issues-list" class="bg-gray-800 rounded-lg shadow-lg">
      <ul class="divide-y divide-gray-700">
        {issues.length > 0 ? (
          issues.map(issue => (
            <li key={issue.id}>
              <a
                href={routes.issues.show.href({ id: String(issue.id) })}
                class="block p-4 hover:bg-gray-700/50 transition-colors"
              >
                <div class="flex items-center space-x-4">
                  <div class="text-green-400">
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
                    <p class="font-semibold text-lg text-white">{issue.title}</p>
                    <p class="text-sm text-gray-400">
                      #{issue.id} opened by {issue.author.username}
                    </p>
                  </div>
                </div>
              </a>
            </li>
          ))
        ) : (
          <li class="p-4 text-center text-gray-400">No issues found.</li>
        )}
      </ul>
    </div>
  )
}
