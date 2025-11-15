import type { Context } from 'hono'
import { setCookie } from 'hono/cookie'
import { sign } from 'hono/jwt'
import type { StatusCode } from 'hono/utils/http-status'
import type { DB } from '@/db'
import { users } from '@/db/schema'
import type { AppEnv } from '@/honostar/server'
import type { User } from '@/types'

type Credentials = { username: string; password: string }

type AuthResult =
  | { user: User; error?: undefined; status?: undefined }
  | { user?: undefined; error: string; status: StatusCode }

export async function handleSignup(db: DB, creds: Credentials): Promise<AuthResult> {
  const existingUser = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.username, creds.username),
  })
  if (existingUser) {
    return { error: 'Username is already taken.', status: 409 }
  }

  const passwordHash = await Bun.password.hash(creds.password)
  const [user] = await db
    .insert(users)
    .values({ username: creds.username, passwordHash })
    .returning()

  if (!user) {
    return { error: 'Failed to create user.', status: 500 }
  }
  return { user }
}

export async function handleLogin(db: DB, creds: Credentials): Promise<AuthResult> {
  const foundUser = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.username, creds.username),
  })
  if (!foundUser) {
    return { error: 'Invalid username or password.', status: 401 }
  }

  const isPasswordValid = await Bun.password.verify(creds.password, foundUser.passwordHash)
  if (!isPasswordValid) {
    return { error: 'Invalid username or password.', status: 401 }
  }
  return { user: foundUser }
}

export async function createAuthResponse(c: Context<AppEnv>, user: User): Promise<Response> {
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

  return c.var.datastar.reply([
    ['patch-signals', { auth: { id: user.id, username: user.username } }],
  ])
}
