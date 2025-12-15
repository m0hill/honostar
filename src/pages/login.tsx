import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createPage } from '@/honostar/server'
import { requireGuest } from '@/lib/auth-middleware'
import { routes } from '@/routes'

function LoginPage(props: { error?: string }) {
  return (
    <div class="flex items-center justify-center min-h-screen bg-background text-foreground px-4">
      <Card class="w-full max-w-md">
        <CardHeader class="text-center">
          <CardTitle class="text-3xl">Welcome Back</CardTitle>
          <CardDescription>Enter your credentials to continue</CardDescription>
        </CardHeader>

        <CardContent class="space-y-6">
          {props.error ? (
            <div
              class="p-3 text-center bg-destructive/10 border border-destructive text-destructive rounded-md text-sm"
              role="alert"
            >
              {props.error}
            </div>
          ) : null}

          <div
            data-show="$error"
            style="display:none"
            class="p-3 text-center bg-destructive/10 border border-destructive text-destructive rounded-md text-sm"
            role="alert"
            data-text="$error"
          ></div>

          <form
            class="space-y-4"
            action={routes.auth.action.href({ action: 'login' })}
            method="post"
            data-on:submit__prevent={`@post('${routes.auth.action.href({ action: 'login' })}', {openWhenHidden: true})`}
            data-indicator="loggingIn"
            data-signals={JSON.stringify({ error: props.error ?? '' })}
            data-signals__ifmissing='{"form":{"username":"","password":""}}'
          >
            <div class="space-y-2">
              <Label for="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="your_username"
                data-bind="form.username"
                name="form.username"
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
                name="form.password"
                required
              />
            </div>

            <Button type="submit" class="w-full" data-attr:disabled="$loggingIn">
              <span data-show="!$loggingIn" style="display:none">
                Login
              </span>
              <span data-show="$loggingIn" style="display:none">
                Logging in...
              </span>
            </Button>
          </form>

          <div class="mt-4 text-center text-sm text-muted-foreground">
            <span>Don&apos;t have an account?</span>{' '}
            <a
              href={routes.signup.href()}
              class="font-medium text-primary underline-offset-4 hover:underline"
            >
              Sign up
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default createPage({
  use: [requireGuest],
  head: {
    title: 'Login • Honostar',
  },

  loader(c) {
    const error = c.req.query('error')
    return Promise.resolve(error ? { error } : {})
  },

  component: LoginPage,
})
