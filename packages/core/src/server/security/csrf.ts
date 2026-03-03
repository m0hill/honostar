import type { Context } from "hono"
import { getCookie, setCookie } from "hono/cookie"
import type { HonostarConfig } from "../config"
import type { AppEnv } from "../context"
import { factory } from "../middleware"
import { envIsProduction } from "../runtime-env"

function matches(pathname: string, patterns: (string | RegExp)[] = []) {
  return patterns.some((p) => (typeof p === "string" ? pathname.startsWith(p) : p.test(pathname)))
}

function isSameOriginRequest(c: Context<AppEnv>, url: URL): boolean {
  const origin = c.req.header("origin")
  if (origin) {
    return origin === url.origin
  }

  const referer = c.req.header("referer")
  if (!referer) return false

  try {
    return new URL(referer).origin === url.origin
  } catch {
    return false
  }
}

/**
 * CSRF protection middleware factory.
 *
 * Configure via Honostar config shape. Legacy options-object signatures were removed.
 */
export const csrf = (cfg?: Pick<HonostarConfig, "security" | "endpoints">) => {
  const cookieName = cfg?.security.csrf?.cookieName ?? "ds_csrf"
  const headerName = cfg?.security.csrf?.headerName ?? "X-CSRF-Token"
  const exceptPaths = cfg?.security.csrf?.exceptPaths ?? [cfg?.endpoints?.sse ?? "/_/events"]
  return factory.createMiddleware(async (c, next) => {
    let token = getCookie(c, cookieName)
    if (!token) {
      token =
        (globalThis.crypto && "randomUUID" in globalThis.crypto && crypto.randomUUID()) ||
        Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
      setCookie(c, cookieName, token, {
        path: "/",
        sameSite: "Lax",
        httpOnly: false,
        secure: envIsProduction(),
      })
    }
    c.set("csrfToken", token)

    const method = c.req.method.toUpperCase()
    const isSafe = method === "GET" || method === "HEAD" || method === "OPTIONS"
    const url = new URL(c.req.url)
    if (!isSafe && !matches(url.pathname, exceptPaths)) {
      const header = c.req.header(headerName)
      if (header) {
        if (header !== token) return c.text("Invalid CSRF token", 403)
      } else {
        // HTML-first fallback: allow native form submissions without custom headers,
        // but only when Origin/Referer proves same-origin.
        if (!isSameOriginRequest(c, url)) {
          return c.text("Invalid CSRF token", 403)
        }
      }
    }
    return await next()
  })
}
