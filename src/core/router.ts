import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { Hono } from 'hono'
import type { AppEnv } from '@/core/context'
import { filePathToRoutePath } from '@/core/path-utils'

const __dirname = dirname(fileURLToPath(import.meta.url))

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS'

export async function mountRoutes(app: Hono<AppEnv>, routesDir = 'src/routes') {
  const abs = resolve(__dirname, '../../', routesDir)
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
          app.on(m, routePath, ...handler)
        } else {
          app.on(m, routePath, handler)
        }
      }
    }

    if (mod.default) {
      const def = mod.default
      if (Array.isArray(def)) {
        app.get(routePath, ...def)
      } else if (typeof def === 'function') {
        app.get(routePath, async c => {
          const out = await def(c)
          if (out instanceof Response) return out
          return c.render(out)
        })
      } else {
      }
    }
  }
}