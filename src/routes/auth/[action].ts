import type { InferSelectModel } from 'drizzle-orm'
import { setCookie } from 'hono/cookie'
import { sign } from 'hono/jwt'
import { z } from 'zod'
import type { AppHandler, FxResponse } from '@/core'
import { users } from '@/db/schema'

const authSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type User = InferSelectModel<typeof users>

export const POST: AppHandler = async c => {
  const { action } = c.req.param()
  const body = await c.req.json()

  const { form } = body
  if (!form || typeof form !== 'object') {
    return c.var.datastar.respond({
      effects: [['patch-signals', { error: 'Invalid request format.' }]],
      status: 400,
    })
  }

  const validation = authSchema.safeParse(form)
  if (!validation.success) {
    const error = validation.error.issues[0]?.message || 'Validation failed'
    return c.var.datastar.respond({ effects: [['patch-signals', { error }]], status: 400 })
  }

  const { username, password } = validation.data
  let user: User | undefined

  if (action === 'signup') {
    const existingUser = await c.var.db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, username),
    })
    if (existingUser) {
      return c.var.datastar.respond({
        effects: [['patch-signals', { error: 'Username is already taken.' }]],
        status: 409,
      })
    }

    const passwordHash = await Bun.password.hash(password)
    const result = await c.var.db.insert(users).values({ username, passwordHash }).returning()
    user = result[0]
  } else {
    const foundUser = await c.var.db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, username),
    })
    if (!foundUser) {
      return c.var.datastar.respond({
        effects: [['patch-signals', { error: 'Invalid username or password.' }]],
        status: 401,
      })
    }

    const isPasswordValid = await Bun.password.verify(password, foundUser.passwordHash)
    if (!isPasswordValid) {
      return c.var.datastar.respond({
        effects: [['patch-signals', { error: 'Invalid username or password.' }]],
        status: 401,
      })
    }
    user = foundUser
  }

  if (!user) {
    return c.var.datastar.respond({
      effects: [['patch-signals', { error: 'An unexpected error occurred.' }]],
      status: 500,
    })
  }

  const payload = {
    id: user.id,
    username: user.username,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
  }
  const token = await sign(payload, process.env.JWT_SECRET!)
  setCookie(c, 'token', token, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
  })

  const response: FxResponse = {
    fx: [['execute-script', 'window.location.href = "/profile"']],
    status: 200,
  }
  return response
}
