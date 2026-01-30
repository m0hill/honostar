import { defineQueryPage } from "@honostar/core/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { requireAuth } from "@/lib/auth-middleware"
import { routes } from "@/generated/routes"
import type { User } from "@/types"

function ProfilePage({ user }: { user: User }) {
  return (
    <div class="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <Card class="text-center max-w-md w-full">
        <CardHeader>
          <CardTitle class="text-4xl">Welcome!</CardTitle>
          <CardDescription class="text-2xl mt-2">{user.username}</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <Button asChild variant="default" size="lg" class="w-full">
            <a href={routes.home.href()}>View Issues</a>
          </Button>
          <form
            action={routes.auth.logout.href()}
            method="post"
            data-on:submit__prevent={`@post('${routes.auth.logout.href()}', {openWhenHidden: true})`}
            data-indicator="loggingOut"
          >
            <Button
              type="submit"
              variant="destructive"
              size="lg"
              class="w-full"
              data-attr:disabled="$loggingOut"
            >
              <span data-show="!$loggingOut" style="display:none">
                Logout
              </span>
              <span data-show="$loggingOut" style="display:none">
                Logging out...
              </span>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default defineQueryPage<{ user: import("@/types").User }>({
  use: [requireAuth],
  head: ({ user }) => ({
    title: `${user.username} • Honostar`,
  }),

  async loader(c) {
    const user = c.var.user!
    return { user }
  },

  component: ProfilePage,
})
