import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { User } from '@/types'

export default function ProfilePage({ user }: { user: User }) {
  return (
    <div class="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <Card class="text-center max-w-md w-full">
        <CardHeader>
          <CardTitle class="text-4xl">Welcome!</CardTitle>
          <CardDescription class="text-2xl mt-2">{user.username}</CardDescription>
        </CardHeader>
        <CardContent>
          <form data-on:submit__prevent="@post('/logout')">
            <Button type="submit" variant="destructive" size="lg">
              Logout
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
