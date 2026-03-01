import type { Context, Env, MiddlewareHandler } from "hono"
import { contextStorage, getContext } from "hono/context-storage"
import type {
  DrainContext,
  HonostarLoggingOptions,
  LogStore,
  LoggerLike,
  SamplingRates,
  TailSamplingCondition,
  TailSamplingContext,
  WideEvent,
  WideEventError,
  WideEventLevel,
  WideEventSpan,
} from "./types"

const StoreKey = "__honostarLog" as const
const SENSITIVE_HEADERS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "x-auth-token",
  "proxy-authorization",
])

const colors = {
  reset: "\x1B[0m",
  dim: "\x1B[2m",
  red: "\x1B[31m",
  yellow: "\x1B[33m",
  cyan: "\x1B[36m",
  white: "\x1B[37m",
  gray: "\x1B[90m",
  green: "\x1B[32m",
} as const

function isDevRuntime(): boolean {
  if (typeof process === "undefined") return true
  return process.env.NODE_ENV !== "production"
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function tryGetContextSafe<E extends Env = Env>(): Context<E> | undefined {
  try {
    return getContext<E>()
  } catch {
    return undefined
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

function deepMergeInto(target: Record<string, unknown>, patch: Record<string, unknown>) {
  for (const [key, patchValue] of Object.entries(patch)) {
    const targetValue = target[key]
    if (isPlainObject(targetValue) && isPlainObject(patchValue)) {
      deepMergeInto(targetValue, patchValue)
      continue
    }
    target[key] = patchValue
  }
}

function matchesPattern(path: string, pattern: string): boolean {
  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "{{GLOBSTAR}}")
    .replace(/\*/g, "[^/]*")
    .replace(/{{GLOBSTAR}}/g, ".*")
    .replace(/\?/g, "[^/]")

  return new RegExp(`^${regexPattern}$`).test(path)
}

function shouldLogPath(path: string, include?: string[], exclude?: string[]): boolean {
  if (exclude && exclude.some((pattern) => matchesPattern(path, pattern))) {
    return false
  }
  if (include && include.length > 0) {
    return include.some((pattern) => matchesPattern(path, pattern))
  }
  return true
}

function getLevelColor(level: WideEventLevel): string {
  switch (level) {
    case "error":
      return colors.red
    case "warn":
      return colors.yellow
    case "debug":
      return colors.gray
    case "info":
    default:
      return colors.cyan
  }
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return String(value)
  if (typeof value === "object") {
    try {
      return JSON.stringify(value)
    } catch {
      return "[unserializable]"
    }
  }
  return String(value)
}

function prettyPrintWideEvent(event: Record<string, unknown>): void {
  const timestamp = typeof event["timestamp"] === "string" ? event["timestamp"] : ""
  const level = (event["level"] as WideEventLevel | undefined) ?? "info"
  const service = typeof event["service"] === "string" ? event["service"] : "app"

  const method = typeof event["method"] === "string" ? event["method"] : "UNKNOWN"
  const path = typeof event["path"] === "string" ? event["path"] : "/"
  const statusCode = typeof event["status_code"] === "number" ? event["status_code"] : undefined
  const durationMs = typeof event["duration_ms"] === "number" ? event["duration_ms"] : undefined

  const ts = timestamp.length >= 23 ? timestamp.slice(11, 23) : timestamp
  const levelColor = getLevelColor(level)
  let header = `${colors.dim}${ts}${colors.reset} ${levelColor}${level.toUpperCase()}${colors.reset}`
  header += ` ${colors.cyan}[${service}]${colors.reset} ${method} ${path}`

  if (statusCode !== undefined) {
    const statusColor = statusCode >= 400 ? colors.red : colors.green
    header += ` ${statusColor}${statusCode}${colors.reset}`
  }
  if (durationMs !== undefined) {
    header += ` ${colors.dim}in ${formatDuration(durationMs)}${colors.reset}`
  }
  console.log(header)

  const keysToSkip = new Set([
    "timestamp",
    "level",
    "service",
    "method",
    "path",
    "status_code",
    "duration_ms",
  ])
  const restEntries = Object.entries(event).filter(
    ([key, value]) => !keysToSkip.has(key) && value !== undefined
  )
  for (const [key, value] of restEntries) {
    console.log(
      `  ${colors.dim}-${colors.reset} ${colors.white}${key}:${colors.reset} ${formatValue(value)}`
    )
  }
}

function createDefaultLogger(opts: { pretty: boolean; stringify: boolean }): LoggerLike {
  const write = (level: "info" | "error", obj: unknown) => {
    if (opts.pretty && typeof obj === "object" && obj !== null) {
      prettyPrintWideEvent(obj as Record<string, unknown>)
      return
    }
    if (opts.stringify) {
      const serialized = JSON.stringify(obj)
      if (level === "error") console.error(serialized)
      else console.log(serialized)
      return
    }
    if (level === "error") console.error(obj)
    else console.log(obj)
  }

  return {
    info(obj) {
      write("info", obj)
    },
    error(obj) {
      write("error", obj)
    },
  }
}

function toWideError(err: unknown, includeStack: boolean): WideEventError {
  if (err instanceof Error) {
    return {
      type: err.name,
      message: err.message,
      ...(includeStack ? { stack: err.stack } : {}),
      ...(err.cause !== undefined ? { cause: err.cause } : {}),
    }
  }

  if (typeof err === "string") {
    return { message: err }
  }

  if (isPlainObject(err)) {
    const message = typeof err.message === "string" ? err.message : undefined
    const type = typeof err.name === "string" ? err.name : undefined
    return {
      ...(type ? { type } : {}),
      ...(message ? { message } : {}),
      cause: err,
    }
  }

  return { message: "Unknown error", cause: err }
}

function getStoreFromContext(): LogStore | undefined {
  const c = tryGetContextSafe<any>()
  if (!c) return undefined
  const store = (c.var as any)?.[StoreKey] as LogStore | undefined
  return store
}

function getLevelFromEvent(event: WideEvent): WideEventLevel {
  if (event.outcome === "error") return "error"
  if (typeof event.status_code === "number" && event.status_code >= 400) return "error"
  if (event.error) return "error"
  return "info"
}

function resolveSamplingRate(level: WideEventLevel, rates: SamplingRates | undefined): number {
  if (!rates) return 100
  const candidate = rates[level]
  // Keep errors by default unless explicitly configured.
  if (level === "error" && candidate === undefined) return 100
  if (candidate === undefined) return 100
  if (!Number.isFinite(candidate)) return 100
  return Math.max(0, Math.min(100, candidate))
}

function shouldSampleEvent(level: WideEventLevel, rates: SamplingRates | undefined): boolean {
  const rate = resolveSamplingRate(level, rates)
  if (rate <= 0) return false
  if (rate >= 100) return true
  return Math.random() * 100 < rate
}

function shouldKeepByTailConditions(
  ctx: TailSamplingContext,
  conditions: TailSamplingCondition[] | undefined
): boolean {
  if (!conditions || conditions.length === 0) return false
  for (const condition of conditions) {
    if (
      condition.status !== undefined &&
      ctx.status !== undefined &&
      ctx.status >= condition.status
    ) {
      return true
    }
    if (condition.durationMs !== undefined && ctx.durationMs >= condition.durationMs) {
      return true
    }
    if (condition.path && matchesPattern(ctx.path, condition.path)) {
      return true
    }
  }
  return false
}

function headersToSafeRecord(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {}
  headers.forEach((value, key) => {
    if (SENSITIVE_HEADERS.has(key.toLowerCase())) return
    out[key] = value
  })
  return out
}

export const log = {
  add(fields: Record<string, unknown>): boolean {
    const store = getStoreFromContext()
    if (!store) return false
    if (!isPlainObject(fields)) return false
    deepMergeInto(store.event, fields)
    return true
  },

  span<T>(name: string, fn: () => T | Promise<T>, meta?: Record<string, unknown>): Promise<T> {
    const started = Date.now()

    const run = async () => {
      try {
        const ret = await fn()
        const store = getStoreFromContext()
        if (store) {
          const span: WideEventSpan = {
            name,
            duration_ms: Date.now() - started,
            ...(meta ? { meta } : {}),
          }
          store.spans.push(span)
        }
        return ret
      } catch (err) {
        const store = getStoreFromContext()
        if (store) {
          const span: WideEventSpan = {
            name,
            duration_ms: Date.now() - started,
            ...(meta ? { meta } : {}),
            error: toWideError(err, false),
          }
          store.spans.push(span)
        }
        throw err
      }
    }

    return run()
  },

  getEvent(): WideEvent | undefined {
    return getStoreFromContext()?.event
  },

  getRequestId(): string | undefined {
    return getStoreFromContext()?.event.request_id
  },
} as const

export function honostarLogging<E extends Env = Env>(
  options: HonostarLoggingOptions<E> = {}
): MiddlewareHandler<E> {
  const enabled = options.enabled ?? true
  const pretty = options.pretty ?? isDevRuntime()
  const stringify = options.stringify ?? true
  const include = options.include
  const exclude = options.exclude

  const storage = contextStorage()
  const includeErrorStack =
    options.includeErrorStack ??
    (typeof process !== "undefined" && process.env.NODE_ENV !== "production")
  const requestIdHeader = options.requestIdHeader ?? "x-request-id"
  const interactionIdHeader = options.interactionIdHeader ?? "x-interaction-id"
  const setResponseRequestIdHeader = options.setResponseRequestIdHeader ?? "x-request-id"
  const logger = options.logger ?? createDefaultLogger({ pretty, stringify })

  return async (c, next) => {
    if (!enabled || !shouldLogPath(c.req.path, include, exclude)) {
      await next()
      return
    }

    return await storage(c as any, async () => {
      const startMs = Date.now()

      const requestId = c.req.header(requestIdHeader) ?? crypto.randomUUID()
      const interactionId = c.req.header(interactionIdHeader) ?? undefined

      if (setResponseRequestIdHeader) {
        c.header(setResponseRequestIdHeader, requestId)
      }

      const base =
        typeof options.base === "function" ? options.base(c as any) : (options.base ?? {})

      const event: WideEvent = {
        timestamp: new Date(startMs).toISOString(),
        request_id: requestId,
        ...(interactionId ? { interaction_id: interactionId } : {}),
        method: c.req.method,
        path: c.req.path,
        url: c.req.url,
        ...(base ? base : {}),
      }

      const spans: WideEventSpan[] = []
      const store: LogStore = { startMs, event, spans }

      ;(c as any).set(StoreKey, store)

      try {
        await next()
        event.status_code = c.res.status
        event.outcome = c.res.status < 400 ? "success" : "error"
        if ((c as any).error instanceof Error) {
          event.error = toWideError((c as any).error, includeErrorStack)
          event.outcome = "error"
          event.status_code = event.status_code ?? 500
        }
      } catch (err) {
        event.status_code = 500
        event.outcome = "error"
        event.error = toWideError(err, includeErrorStack)
        throw err
      } finally {
        event.duration_ms = Date.now() - startMs
        if (spans.length > 0) {
          event.spans = spans
        }

        try {
          if (options.enrichers?.length) {
            for (const enrich of options.enrichers) {
              await enrich(c as any, event)
            }
          }
        } catch (err) {
          event.outcome = "error"
          event.error = toWideError(err, includeErrorStack)
        }

        const level = getLevelFromEvent(event)
        event.level = level

        const tailContext: TailSamplingContext = {
          durationMs: event.duration_ms ?? 0,
          path: event.path,
          method: event.method,
          event,
          shouldKeep: false,
        }
        if (event.status_code !== undefined) {
          tailContext.status = event.status_code
        }
        tailContext.shouldKeep = shouldKeepByTailConditions(tailContext, options.sampling?.keep)

        if (options.keep) {
          await options.keep(tailContext)
        }

        const forceKeep = tailContext.shouldKeep === true
        if (!forceKeep && !shouldSampleEvent(level, options.sampling?.rates)) {
          return
        }

        if (level === "error") {
          logger.error(event)
        } else {
          logger.info(event)
        }

        if (options.drain) {
          const requestId = typeof event.request_id === "string" ? event.request_id : "unknown"
          const drainContext: DrainContext = {
            event,
            request: {
              method: event.method,
              path: event.path,
              requestId,
            },
            response: {
              status: event.status_code ?? c.res.status,
              durationMs: event.duration_ms ?? 0,
            },
            headers: headersToSafeRecord(c.req.raw.headers),
          }

          Promise.resolve(options.drain(drainContext)).catch((err) => {
            console.error("[@honostar/logging] drain failed", err)
          })
        }
      }
    })
  }
}
