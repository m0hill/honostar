import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { Context, Hono } from 'hono'
import type { AppEnv } from '@/core/context'
import type { FxResponse } from '@/core/datastar/middleware'
import type { HandlerDefinition, PageDefinition } from '@/core/page'

const __dirname = dirname(fileURLToPath(import.meta.url))

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS'

function filePathToRoutePath(filePath: string): string {
  let p = filePath
    .replace(/\\/g, '/')
    .replace(/^.*\/pages\//, '')
    .replace(/\.(tsx|ts|mdx|md)$/, '')

  p = p.replace(/\((.+?)\)/g, '')

  p = p.replace(/\[\.{3}.*\]/g, '*')
  p = p.replace(/\[(.+?)\]/g, ':$1')

  p = p.replace(/\/index$/, '')
  if (p === 'index') p = ''
  p = '/' + p
  p = p.replace(/\/\/+/g, '/')
  return p
}

function isFxResponse(value: unknown): value is FxResponse {
  if (typeof value !== 'object' || value === null || value instanceof Response) {
    return false
  }
  return 'fx' in value && Array.isArray(value.fx)
}

function isPageDefinition(value: unknown): value is PageDefinition {
  return (
    typeof value === 'object' &&
    value !== null &&
    'component' in value &&
    typeof (value as Record<string, unknown>).component === 'function'
  )
}

function isHandlerDefinition(value: unknown): value is HandlerDefinition {
  return (
    typeof value === 'object' &&
    value !== null &&
    'handler' in value &&
    typeof (value as Record<string, unknown>).handler === 'function'
  )
}

function wrapHandler(handler: Function) {
  return async (c: Context<AppEnv>) => {
    const finalHandler = isHandlerDefinition(handler) ? handler.handler : handler
    const result = await finalHandler(c)

    if (isFxResponse(result)) {
      c.set('fxResponse', result)
      return c.res
    }

    return result
  }
}

export async function mountRoutes(app: Hono<AppEnv>, pagesDir = 'src/pages') {
  const abs = resolve(__dirname, '../../', pagesDir)
  const glob = new Bun.Glob('**/*.{ts,tsx}')

  for (const rel of glob.scanSync({ cwd: abs })) {
    if (/\/_[a-zA-Z0-9_.-]+\.(ts|tsx)$/.test(rel)) continue

    const full = join(abs, rel)
    const mod = await import(pathToFileURL(full).href)
    const routePath = filePathToRoutePath(join(pagesDir, rel))

    const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
    for (const m of methods) {
      const handler = mod[m]
      if (handler) {
        const handlers = Array.isArray(handler) ? handler : [handler]
        const middlewares = handlers.flatMap(h => (isHandlerDefinition(h) && h.use ? h.use : []))
        if (Array.isArray(handler)) {
          app.on(m, routePath, ...middlewares, ...handler.map(wrapHandler))
        } else {
          app.on(m, routePath, ...middlewares, wrapHandler(handler))
        }
      }
    }

    if (mod.default && isPageDefinition(mod.default)) {
      const pageDef = mod.default

      const pageHandler = async (c: Context<AppEnv>) => {
        if (pageDef.topics) {
          const topics =
            typeof pageDef.topics === 'function' ? await pageDef.topics(c) : pageDef.topics
          c.set('sseTopics', topics)
        }

        const loaderResult = (await pageDef.loader?.(c)) ?? {}
        if (loaderResult instanceof Response) {
          return loaderResult
        }

        const pageComponent = pageDef.component(loaderResult)

        if (c.req.header('Datastar-Request')) {
          const html = await c.var.renderFragmentToString(pageComponent)
          return c.var.datastar.respond({
            toClient: true,
            effects: [
              ['patch-elements', html, { selector: '#app', mode: 'outer' }],
              ['execute-script', `history.pushState({}, '', '${c.req.path}')`],
            ],
          })
        }

        return c.render(pageComponent)
      }

      const handlers = [...(pageDef.use || []), pageHandler]
      app.get(routePath, ...handlers)
    }
  }
}
