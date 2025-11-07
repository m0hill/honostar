import type { User } from '@/types'

export default function ProfilePage({ user }: { user: User }) {
  return (
    <div class="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div class="text-center p-8 bg-gray-800 rounded-lg shadow-lg">
        <h1 class="text-4xl font-bold text-cyan-400">Welcome!</h1>
        <p class="mt-2 text-2xl text-gray-300">{user.username}</p>
        <form data-on:submit__prevent="@post('/logout')" class="mt-6">
          <button
            type="submit"
            class="py-2 px-6 bg-red-600 hover:bg-red-700 rounded-md font-semibold transition-colors"
          >
            Logout
          </button>
        </form>
      </div>
    </div>
  )
}
