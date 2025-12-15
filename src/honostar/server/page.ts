import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { Context, MiddlewareHandler } from 'hono'
import type { JSX } from 'hono/jsx/jsx-runtime'
import type { AppEnv } from '@/honostar/server/context'
import type { FxResponse } from '@/honostar/server/sse/middleware'

type PageLoader<T extends Record<string, unknown> = {}> = (
  c: Context<AppEnv>
) => Promise<T | Response>

type PageComponent<T extends Record<string, unknown> = {}> = (props: T) => JSX.Element

type PageTopics = string[] | ((c: Context<AppEnv>) => string[] | Promise<string[]>)

export type PageHeadElements = JSX.Element | JSX.Element[] | null | undefined

export type PageHead = {
  /**
   * Per-page document title.
   * Prefer this over providing a <title> element in `elements`.
   */
  title?: string
  /**
   * Per-page document language (e.g. "en", "fr-CA").
   */
  lang?: string
  /**
   * Additional <head> elements (meta/link/script/style, etc).
   */
  elements?: PageHeadElements
}

export type PageHeadResolver<T extends Record<string, unknown> = {}> = (
  props: T,
  c: Context<AppEnv>
) => PageHead | Promise<PageHead>

export type PageHeadDefinition<T extends Record<string, unknown> = {}> =
  | PageHead
  | PageHeadResolver<T>
  | Array<PageHead | PageHeadResolver<T>>

export type ResolvedPageHead = {
  title?: string
  lang?: string
  elements: JSX.Element[]
}

export async function resolvePageHead<T extends Record<string, unknown>>(
  head: PageHeadDefinition<T>,
  props: T,
  c: Context<AppEnv>
): Promise<ResolvedPageHead> {
  const definitions = Array.isArray(head) ? head : [head]

  let title: string | undefined
  let lang: string | undefined
  const elements: JSX.Element[] = []

  for (const def of definitions) {
    const resolved = typeof def === 'function' ? await def(props, c) : def
    if (resolved.title !== undefined) title = resolved.title
    if (resolved.lang !== undefined) lang = resolved.lang
    if (resolved.elements) {
      elements.push(...(Array.isArray(resolved.elements) ? resolved.elements : [resolved.elements]))
    }
  }

  const result: ResolvedPageHead = { elements }
  if (title !== undefined) result.title = title
  if (lang !== undefined) result.lang = lang
  return result
}

export type PageLayout<T extends Record<string, unknown> = {}> = (
  c: Context<AppEnv>,
  props: T,
  children: JSX.Element
) => JSX.Element

/**
 * Layouts are applied "outer -> inner" (i.e. `[Outer, Inner]` becomes `Outer(Inner(Page))`).
 */
export type PageLayoutDefinition<T extends Record<string, unknown> = {}> =
  | PageLayout<T>
  | PageLayout<T>[]

export function resolvePageLayouts<T extends Record<string, unknown>>(
  layouts: PageLayoutDefinition<T> | undefined
): PageLayout<T>[] {
  if (!layouts) return []
  return Array.isArray(layouts) ? layouts : [layouts]
}

export interface PageDefinition<T extends Record<string, unknown> = {}> {
  use?: MiddlewareHandler<AppEnv>[]
  loader?: PageLoader<T>
  component: PageComponent<T>
  topics?: PageTopics
  head?: PageHeadDefinition<T>
  layout?: PageLayoutDefinition<T>
}

type ValidationHook = (
  result: { success: false; error: readonly StandardSchemaV1.Issue[] },
  c: Context<AppEnv>
) => Response | FxResponse | Promise<Response | FxResponse>

interface BaseHandlerDefinition {
  use?: MiddlewareHandler<AppEnv>[]
  handler: (c: Context<AppEnv>) => Promise<Response | FxResponse>
}

interface ValidatedHandlerDefinition<Schema extends StandardSchemaV1> {
  schema: Schema
  use?: MiddlewareHandler<AppEnv>[]
  hook?: ValidationHook
  handler: (
    c: Context<AppEnv>,
    data: StandardSchemaV1.InferOutput<Schema>
  ) => Promise<Response | FxResponse>
}

export type HandlerDefinition = BaseHandlerDefinition

function isValidatedHandler<Schema extends StandardSchemaV1>(
  def: ValidatedHandlerDefinition<Schema> | BaseHandlerDefinition
): def is ValidatedHandlerDefinition<Schema> {
  return 'schema' in def && def.schema !== undefined
}

export function createPage<T extends Record<string, unknown>>(
  definition: PageDefinition<T>
): PageDefinition<T> {
  return definition
}

/**
 * Creates a handler with automatic Datastar request validation and type-safe data extraction.
 *
 * This is the unified handler creator that handles both validated and non-validated cases.
 * It automatically detects whether a schema is provided and adjusts behavior accordingly.
 *
 * **Validated Handler (with schema):**
 * - Automatically extracts data from JSON body (POST/PUT/PATCH/DELETE) or query param (GET)
 * - Validates data against any Standard Schema compliant validator (Zod, Valibot, ArkType, etc.)
 * - Provides 100% type-safe data to your handler
 * - Handles validation errors via optional hook or sensible default
 *
 * **Base Handler (without schema):**
 * - Simple passthrough for traditional endpoints
 * - No validation, no data extraction
 * - Full manual control
 *
 * @example
 * ```typescript
 * // Validated handler with Zod (recommended for Datastar endpoints)
 * import { z } from 'zod'
 *
 * const schema = z.object({
 *   issue: z.object({
 *     title: z.string().min(1, 'Title is required'),
 *   })
 * })
 *
 * export const POST = createHandler({
 *   schema,
 *   use: [requireAuth],
 *   hook: (result, c) => {
 *     const error = result.error[0]?.message || 'Invalid input'
 *     return c.var.fx.reply([['patch-signals', { error }]], { status: 400 })
 *   },
 *   async handler(c, data) {
 *     // data is 100% type-safe!
 *     const { issue } = data
 *     // ... your logic
 *   }
 * })
 *
 * // Validated handler with Valibot
 * import * as v from 'valibot'
 *
 * const schema = v.object({
 *   email: v.pipe(v.string(), v.email()),
 *   age: v.number()
 * })
 *
 * export const POST = createHandler({
 *   schema,
 *   async handler(c, data) {
 *     // data.email and data.age are fully typed!
 *   }
 * })
 *
 * // Base handler (for traditional endpoints)
 * export const POST = createHandler({
 *   async handler(c) {
 *     deleteCookie(c, 'token')
 *     return c.redirect('/login', 303)
 *   }
 * })
 * ```
 */
export function createHandler<Schema extends StandardSchemaV1>(
  definition: ValidatedHandlerDefinition<Schema>
): HandlerDefinition
export function createHandler(definition: BaseHandlerDefinition): HandlerDefinition
export function createHandler<Schema extends StandardSchemaV1>(
  definition: ValidatedHandlerDefinition<Schema> | BaseHandlerDefinition
): HandlerDefinition {
  // Use type guard to properly narrow the union type
  if (isValidatedHandler(definition)) {
    return {
      ...(definition.use ? { use: definition.use } : {}),
      async handler(c) {
        let rawData: unknown

        // 1. Automatically find the data based on request method
        if (c.req.method === 'GET') {
          // GET requests: data is in the 'datastar' query parameter as a JSON string
          const datastarParam = c.req.query('datastar')
          try {
            rawData = datastarParam ? JSON.parse(datastarParam) : {}
          } catch {
            rawData = {}
          }
        } else {
          // POST/PUT/PATCH/DELETE requests: data is in the JSON body
          try {
            rawData = await c.req.json()
          } catch {
            rawData = {}
          }
        }

        // 2. Validate the data against the Standard Schema
        const result = await definition.schema['~standard'].validate(rawData)

        // 3. Run validation hook on failure
        if (result.issues) {
          if (definition.hook) {
            return definition.hook({ success: false, error: result.issues }, c)
          }
          // Default error response if no hook provided
          const error = result.issues[0]?.message || 'Invalid input'
          return c.var.fx.reply([['patch-signals', { error }]], { status: 400 })
        }

        // 4. On success, call the handler with 100% type-safe data
        return definition.handler(c, result.value)
      },
    }
  }

  // Type guard ensures definition is BaseHandlerDefinition here
  return {
    ...(definition.use ? { use: definition.use } : {}),
    handler: definition.handler,
  }
}
