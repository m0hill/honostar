import type { Context } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import type { HonostarConfig } from '../config'
import type { AppEnv } from '../context'
import { factory } from '../middleware'

type CsrfOpts = {
  cookieName?: string
  headerName?: string
  exceptPaths?: (string | RegExp)[]
}

function matches(pathname: string, patterns: (string | RegExp)[] = []) {
  return patterns.some(p => (typeof p === 'string' ? pathname.startsWith(p) : p.test(pathname)))
}

function isSameOriginRequest(c: Context<AppEnv>, url: URL): boolean {
  const origin = c.req.header('origin')
  if (origin) {
    return origin === url.origin
  }

  const referer = c.req.header('referer')
  if (!referer) return false

  try {
    return new URL(referer).origin === url.origin
  } catch {
    return false
  }
}

/**
 * CSRF protection middleware factory
 * Accepts either a HonostarConfig or legacy CsrfOpts for backwards compatibility
 */
export const csrf = (cfg?: Pick<HonostarConfig, 'security' | 'endpoints'> | CsrfOpts) => {
  // Normalize config: handle both new HonostarConfig and legacy CsrfOpts
  let opts: CsrfOpts
  if (cfg && 'security' in cfg) {
    // New HonostarConfig format
    opts = {
      cookieName: cfg.security.csrf?.cookieName ?? 'ds_csrf',
      headerName: cfg.security.csrf?.headerName ?? 'X-CSRF-Token',
      exceptPaths: cfg.security.csrf?.exceptPaths ?? [cfg.endpoints?.sse ?? '/_/events'],
    }
  } else {
    // Legacy CsrfOpts format
    opts = cfg ?? {}
  }

  return factory.createMiddleware(async (c, next) => {
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
      if (header) {
        if (header !== token) return c.text('Invalid CSRF token', 403)
      } else {
        // HTML-first fallback: allow native form submissions without custom headers,
        // but only when Origin/Referer proves same-origin.
        if (!isSameOriginRequest(c, url)) {
          return c.text('Invalid CSRF token', 403)
        }
      }
    }
    return await next()
  })
}
