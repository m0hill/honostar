import type { User } from '@/types'

export default function IndexPage({ user }: { user: User | null }) {
  return (
    <div class="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div class="text-center p-8 bg-gray-800 rounded-lg shadow-lg max-w-lg">
        <h1 class="text-5xl font-bold text-cyan-400">GitHub Issues Clone</h1>
        <p class="mt-4 text-lg text-gray-300">
          A simple, reactive issue tracker built with Bonsai and Datastar.
        </p>

        <div class="mt-8">
          {user ? (
            <div>
              <p class="text-xl">
                Welcome back, <span class="font-bold">{user.username}</span>!
              </p>
              <a
                href="/profile"
                class="mt-4 inline-block py-2 px-6 bg-blue-600 hover:bg-blue-700 rounded-md font-semibold transition-colors"
              >
                Go to Profile
              </a>
            </div>
          ) : (
            <div>
              <p class="text-xl">Please log in to continue.</p>
              <a
                href="/login"
                class="mt-4 inline-block py-2 px-6 bg-green-600 hover:bg-green-700 rounded-md font-semibold transition-colors"
              >
                Login or Sign Up
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
