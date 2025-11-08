import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  return (
    <div class="flex items-center justify-center min-h-screen bg-background text-foreground px-4">
      <Card
        class="w-full max-w-md"
        data-signals={`{
          "mode": "login",
          "error": "",
          "form": { "username": "", "password": "" }
        }`}
      >
        <CardHeader class="text-center">
          <CardTitle
            class="text-3xl"
            data-text="$mode === 'login' ? 'Welcome Back' : 'Create Account'"
          ></CardTitle>
          <CardDescription>Enter your credentials to continue</CardDescription>
        </CardHeader>

        <CardContent class="space-y-6">
          <div
            data-show="$error"
            style="display:none"
            class="p-3 text-center bg-destructive/10 border border-destructive text-destructive rounded-md text-sm"
            role="alert"
            data-text="$error"
          ></div>

          <form
            class="space-y-4"
            data-on:submit__prevent="@post($mode === 'login' ? '/auth/login' : '/auth/signup')"
          >
            <div class="space-y-2">
              <Label for="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="your_username"
                data-bind="form.username"
                required
              />
            </div>

            <div class="space-y-2">
              <Label for="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                data-bind="form.password"
                required
              />
            </div>

            <Button
              type="submit"
              class="w-full"
              data-text="$mode === 'login' ? 'Login' : 'Sign Up'"
            ></Button>
          </form>

          <div class="text-center text-sm text-muted-foreground">
            <span data-text="$mode === 'login' ? 'Don\'t have an account?' : 'Already have an account?'"></span>
            <Button
              variant="link"
              class="p-0 h-auto font-medium"
              data-on:click="$mode = ($mode === 'login' ? 'signup' : 'login'); $error = ''"
            >
              <span data-text="$mode === 'login' ? ' Sign Up' : ' Login'"></span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
