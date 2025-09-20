import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { Context } from 'hono'
import { Hono } from 'hono'
import type { AppEnv } from '@/core/context'
import { filePathToRoutePath } from '@/core/router/path-utils'
import type { FxResponse } from '@/core/sse/middleware'

const __dirname = dirname(fileURLToPath(import.meta.url))

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS'

function isFxResponse(value: unknown): value is FxResponse {
  if (typeof value !== 'object' || value === null || value instanceof Response) {
    return false
  }
  return 'fx' in value && Array.isArray(value.fx)
}

function wrapHandler(handler: Function) {
  return async (c: Context<AppEnv>) => {
    const result = await handler(c)

    if (isFxResponse(result)) {
      c.set('fxResponse', result)
      return c.res
    }

    return result
  }
}

export async function mountRoutes(app: Hono<AppEnv>, routesDir = 'src/routes') {
  const abs = resolve(__dirname, '../../../', routesDir)
  const glob = new Bun.Glob('**/*.{ts,tsx}')

  for (const rel of glob.scanSync({ cwd: abs })) {
    if (/\/_[a-zA-Z0-9_.-]+\.(ts|tsx)$/.test(rel)) continue

    const full = join(abs, rel)
    const mod = await import(pathToFileURL(full).href)
    const routePath = filePathToRoutePath(join(routesDir, rel))

    const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
    for (const m of methods) {
      const handler = mod[m]
      if (handler) {
        if (Array.isArray(handler)) {
          app.on(m, routePath, ...handler.map(wrapHandler))
        } else {
          app.on(m, routePath, wrapHandler(handler))
        }
      }
    }

    if (mod.default) {
      const def = mod.default
      if (Array.isArray(def)) {
        app.get(routePath, ...def.map(wrapHandler))
      } else if (typeof def === 'function') {
        app.get(
          routePath,
          wrapHandler(async (c: Context<AppEnv>) => {
            const out = await def(c)
            if (out instanceof Response) return out
            return c.render(out)
          })
        )
      }
    }
  }
}
