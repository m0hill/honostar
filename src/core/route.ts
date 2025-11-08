/* oxlint-disable typescript-eslint/no-unsafe-type-assertion */

type Primitive = string | number

/**
 * Extract param names from a path like `/issues/:id/comments/:commentId`
 */
type ExtractParamNames<Path extends string> = Path extends `${string}:${infer Rest}`
  ? Rest extends `${infer Param}/${infer Tail}`
    ? TrimOptional<Param> | ExtractParamNames<`/${Tail}`>
    : TrimOptional<Rest>
  : never

type TrimOptional<Value extends string> = Value extends `${infer Name}?` ? Name : Value

type ParamsFor<Path extends string> = ExtractParamNames<Path> extends never
  ? Record<string, never>
  : { [Key in ExtractParamNames<Path>]: Primitive }

type RouteHref<Path extends string> = ExtractParamNames<Path> extends never
  ? () => string
  : (params: ParamsFor<Path>) => string

export type Route<Path extends string> = {
  readonly pattern: Path
  readonly href: RouteHref<Path>
}

type RouteDefinition = string | RouteDefinitionGroup

interface RouteDefinitionGroup {
  [key: string]: RouteDefinition
}

type RuntimeRoutes = {
  [key: string]: Route<string> | RuntimeRoutes
}

export type BuildRoutes<Defs extends RouteDefinitionGroup> = {
  [Key in keyof Defs]: Defs[Key] extends string
    ? Route<Extract<Defs[Key], string>>
    : Defs[Key] extends RouteDefinitionGroup
      ? BuildRoutes<Defs[Key]>
      : never
}

export function route<const Defs extends RouteDefinitionGroup>(defs: Defs): BuildRoutes<Defs> {
  // TypeScript cannot perfectly correlate the runtime builder with the conditional type,
  // so we assert at the public boundary after constructing the structure.
  return buildRoutes(defs) as BuildRoutes<Defs>
}

function buildRoutes(defs: RouteDefinitionGroup): RuntimeRoutes {
  const entries: RuntimeRoutes = {}

  for (const key of Object.keys(defs)) {
    const value = defs[key]

    if (typeof value === 'string') {
      entries[key] = createRoute(value)
      continue
    }

    if (typeof value === 'object' && value !== null) {
      entries[key] = buildRoutes(value)
      continue
    }

    throw new Error(`Invalid route definition for "${key}"`)
  }

  return entries
}

function createRoute<Path extends string>(pattern: Path): Route<Path> {
  const href = ((params?: Record<string, Primitive>) =>
    buildPath(pattern, params)) as Route<Path>['href']

  return {
    pattern,
    href,
  }
}

const PARAM_REGEX = /:([A-Za-z0-9_]+)/g

function buildPath(pattern: string, params?: Record<string, Primitive>): string {
  if (!params) {
    ensureNoParams(pattern)
    return pattern
  }

  return pattern.replace(PARAM_REGEX, (_match, key: string) => {
    if (!(key in params)) {
      throw new Error(`Missing param "${key}" for route "${pattern}"`)
    }

    return encodeURIComponent(String(params[key]))
  })
}

function ensureNoParams(pattern: string) {
  const hasParams = PARAM_REGEX.test(pattern)
  PARAM_REGEX.lastIndex = 0

  if (hasParams) {
    throw new Error(`Route "${pattern}" requires params but none were provided`)
  }
}
