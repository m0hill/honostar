import { getCookie, setCookie } from 'hono/cookie'
import { factory } from '@/core/middleware'

type CsrfOpts = {
  cookieName?: string
  headerName?: string
  exceptPaths?: (string | RegExp)[]
}

function matches(pathname: string, patterns: (string | RegExp)[] = []) {
  return patterns.some(p => (typeof p === 'string' ? pathname.startsWith(p) : p.test(pathname)))
}

export const csrf = (opts: CsrfOpts = {}) =>
  factory.createMiddleware(async (c, next) => {
    const cookieName = opts.cookieName ?? 'ds_csrf'
    const headerName = opts.headerName ?? 'X-CSRF-Token'
    const exceptPaths = opts.exceptPaths ?? ['/_/events']

    let token = getCookie(c, cookieName)
    if (!token) {
      token =
        (globalThis.crypto && 'randomUUID' in globalThis.crypto && crypto.randomUUID()) ||
        Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
      setCookie(c, cookieName, token, {
        path: '/',
        sameSite: 'Lax',
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
      })
    }
    c.set('csrfToken', token)

    const method = c.req.method.toUpperCase()
    const isSafe = method === 'GET' || method === 'HEAD' || method === 'OPTIONS'
    const url = new URL(c.req.url)
    if (!isSafe && !matches(url.pathname, exceptPaths)) {
      const header = c.req.header(headerName)
      if (!header || header !== token) {
        return c.text('Invalid CSRF token', 403)
      }
    }
    return await next()
  })
