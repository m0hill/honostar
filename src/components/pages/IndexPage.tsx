import type { IssueWithAuthor, User } from '@/types'

export default function IndexPage({
  user,
  issues,
}: {
  user: User | null
  issues: IssueWithAuthor[]
}) {
  return (
    <div class="min-h-screen bg-gray-900 text-white flex flex-col items-center pt-10">
      <div class="text-center p-8 bg-gray-800 rounded-lg shadow-lg max-w-4xl w-full">
        <h1 class="text-5xl font-bold text-cyan-400">GitHub Issues Clone</h1>
        <p class="mt-4 text-lg text-gray-300">
          A simple, reactive issue tracker built with Bonsai and Datastar.
        </p>

        <div class="mt-8">
          {user ? (
            <div class="flex justify-between items-center">
              <p class="text-xl">
                Welcome back, <span class="font-bold">{user.username}</span>!
              </p>
              <a
                href="/profile"
                data-on-click__prevent="@get('/profile')"
                class="py-2 px-6 bg-blue-600 hover:bg-blue-700 rounded-md font-semibold transition-colors"
              >
                Go to Profile
              </a>
            </div>
          ) : (
            <div>
              <p class="text-xl">Please log in to continue.</p>
              <a
                href="/login"
                data-on-click__prevent="@get('/login')"
                class="mt-4 inline-block py-2 px-6 bg-green-600 hover:bg-green-700 rounded-md font-semibold transition-colors"
              >
                Login or Sign Up
              </a>
            </div>
          )}
        </div>
      </div>

      <div class="mt-8 max-w-4xl w-full">
        <div class="flex justify-between items-center mb-4 px-4 sm:px-0">
          <h2 class="text-3xl font-bold text-gray-100">Issues</h2>
          {user && (
            <button class="py-2 px-4 bg-green-600 hover:bg-green-700 rounded-md font-semibold transition-colors">
              Create Issue
            </button>
          )}
        </div>
        <div class="bg-gray-800 rounded-lg shadow-lg">
          <ul class="divide-y divide-gray-700">
            {issues.length > 0 ? (
              issues.map(issue => (
                <li key={issue.id} class="p-4 flex items-center space-x-4">
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
                </li>
              ))
            ) : (
              <li class="p-4 text-center text-gray-400">No issues found.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
