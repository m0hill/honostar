import { z } from 'zod'
import type { AppHandler } from '@/core'
import { createAuthResponse, handleLogin, handleSignup } from '@/lib/auth'

const authSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const POST: AppHandler = async c => {
  const { action } = c.req.param()
  const { form } = await c.req.json()

  const validation = authSchema.safeParse(form)
  if (!validation.success) {
    const error = validation.error.issues[0]?.message || 'Validation failed'
    return c.var.datastar.respond({ effects: [['patch-signals', { error }]], status: 400 })
  }

  const result =
    action === 'signup'
      ? await handleSignup(c.var.db, validation.data)
      : await handleLogin(c.var.db, validation.data)

  if (result.user) {
    return createAuthResponse(c, result.user)
  }

  return c.var.datastar.respond({
    effects: [['patch-signals', { error: result.error }]],
    status: result.status,
  })
}
