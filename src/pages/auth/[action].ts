import { z } from 'zod'
import { defineCommand } from '@/honostar/server'
import { createAuthResponse, handleLogin, handleSignup } from '@/lib/auth'
import { routes } from '@/routes'

const authPayloadSchema = z.object({
  form: z.object({
    username: z.string().min(3, 'Username must be at least 3 characters'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
})

export const POST = defineCommand({
  schema: authPayloadSchema,
  hook: (result, c) => {
    const error = result.error[0]?.message || 'Validation failed'
    if (c.req.header('datastar-request') !== null) {
      return c.var.fx.reply([['patch-signals', { error }]], { status: 400 })
    }
    const { action } = c.req.param()
    const target = action === 'signup' ? routes.signup.href() : routes.auth.login.href()
    return c.redirect(`${target}?error=${encodeURIComponent(error)}`, 303)
  },

  async handler(c, data) {
    const { action } = c.req.param()

    const result =
      action === 'signup'
        ? await handleSignup(c.var.db, data.form)
        : await handleLogin(c.var.db, data.form)

    if (result.user) {
      await createAuthResponse(c, result.user) // sets the cookie
      return c.redirect(routes.auth.profile.href(), 303) // let the browser navigate
    }

    if (c.req.header('datastar-request') !== null) {
      return c.var.fx.reply([['patch-signals', { error: result.error }]], {
        status: result.status,
      })
    }
    const target = action === 'signup' ? routes.signup.href() : routes.auth.login.href()
    return c.redirect(`${target}?error=${encodeURIComponent(result.error)}`, 303)
  },
})
