export default function LoginPage() {
  return (
    <div class="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <div
        class="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-lg"
        data-signals={`{
          "mode": "login",
          "error": "",
          "form": { "username": "", "password": "" }
        }`}
      >
        <div class="text-center">
          <h1
            class="text-3xl font-bold text-cyan-400"
            data-text="$mode === 'login' ? 'Welcome Back' : 'Create Account'"
          ></h1>
          <p class="text-gray-400">Enter your credentials to continue</p>
        </div>

        <div
          data-show="$error"
          class="p-3 text-center bg-red-900/50 border border-red-700 text-red-300 rounded-md"
          data-text="$error"
        ></div>

        <form
          class="space-y-6"
          data-on-submit__prevent="@post($mode === 'login' ? '/auth/login' : '/auth/signup')"
        >
          <div>
            <label for="username" class="block text-sm font-medium text-gray-300">
              Username
            </label>
            <input
              id="username"
              type="text"
              class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
              placeholder="your_username"
              data-bind="form.username"
              required
            />
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-gray-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
              placeholder="••••••••"
              data-bind="form.password"
              required
            />
          </div>

          <div>
            <button
              type="submit"
              class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              data-text="$mode === 'login' ? 'Login' : 'Sign Up'"
            ></button>
          </div>
        </form>

        <div class="text-center text-sm text-gray-400">
          <span data-text="$mode === 'login' ? 'Don\'t have an account?' : 'Already have an account?'"></span>
          <button
            class="font-medium text-cyan-400 hover:text-cyan-300"
            data-on-click="$mode = ($mode === 'login' ? 'signup' : 'login'); $error = ''"
          >
            <span data-text="$mode === 'login' ? ' Sign Up' : ' Login'"></span>
          </button>
        </div>
      </div>
    </div>
  )
}
