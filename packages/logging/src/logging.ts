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
  blue: "\x1B[34m",
  magenta: "\x1B[35m",
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

function getMethodColor(method: string): string {
  switch (method.toUpperCase()) {
    case "GET":
      return colors.cyan
    case "POST":
      return colors.blue
    case "PUT":
      return colors.yellow
    case "PATCH":
      return colors.magenta
    case "DELETE":
      return colors.red
    case "HEAD":
      return colors.gray
    case "OPTIONS":
      return colors.white
    default:
      return colors.white
  }
}

function getStatusColor(statusCode: number): string {
  if (statusCode >= 500) return colors.red
  if (statusCode >= 400) return colors.yellow
  if (statusCode >= 300) return colors.cyan
  if (statusCode >= 200) return colors.green
  return colors.gray
}

function getDurationColor(ms: number): string {
  if (ms >= 2000) return colors.red
  if (ms >= 800) return colors.yellow
  return colors.green
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return String(value)
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (Array.isArray(value)) return safeJsonStringify(value)
  if (isPlainObject(value)) {
    const entries = Object.entries(value)
    if (entries.length === 0) return "{}"
    const compactParts = entries.map(([key, nested]) => {
      if (
        typeof nested === "string" ||
        typeof nested === "number" ||
        typeof nested === "boolean" ||
        nested === null
      ) {
        return `${key}=${String(nested)}`
      }
      return `${key}=${safeJsonStringify(nested)}`
    })
    return compactParts.join(" ")
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value)
    } catch {
      return "[unserializable]"
    }
  }
  return String(value)
}

function safeJsonStringify(value: unknown): string {
  try {
    const serialized = JSON.stringify(value)
    return serialized === undefined ? "null" : serialized
  } catch {
    return '"[unserializable]"'
  }
}

function sanitizeUrlForLogging(
  urlString: string,
  opts?: { redactQueryParams?: string[]; dropQueryParams?: string[] }
): string {
  const redactDefaults = [
    "topicstoken",
    "token",
    "access_token",
    "refresh_token",
    "id_token",
    "code",
    "state",
    "signature",
    "sig",
  ]
  const dropDefaults = ["datastar"]

  const redact = new Set((opts?.redactQueryParams ?? redactDefaults).map((k) => k.toLowerCase()))
  const drop = new Set((opts?.dropQueryParams ?? dropDefaults).map((k) => k.toLowerCase()))

  try {
    const url = new URL(urlString)
    for (const key of Array.from(url.searchParams.keys())) {
      const normalized = key.toLowerCase()
      if (drop.has(normalized)) {
        url.searchParams.delete(key)
        continue
      }
      if (redact.has(normalized)) {
        url.searchParams.set(key, "[redacted]")
      }
    }
    return url.toString()
  } catch {
    return urlString
  }
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
  const methodColor = getMethodColor(method)
  let header = `${colors.dim}${ts}${colors.reset} ${levelColor}${level.toUpperCase()}${colors.reset}`
  header += ` ${colors.cyan}[${service}]${colors.reset} ${methodColor}${method}${colors.reset} ${colors.white}${path}${colors.reset}`

  if (statusCode !== undefined) {
    const statusColor = getStatusColor(statusCode)
    header += ` ${statusColor}${statusCode}${colors.reset}`
  }
  if (durationMs !== undefined) {
    const durationColor = getDurationColor(durationMs)
    header += ` ${colors.dim}in${colors.reset} ${durationColor}${formatDuration(durationMs)}${colors.reset}`
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
  const detailLines: Array<{ key: string; value: string; color?: string }> = []
  for (const [key, value] of restEntries) {
    if (key === "error" && isPlainObject(value)) {
      const message =
        typeof value.message === "string" && value.message.length > 0
          ? value.message
          : "Unknown error"
      detailLines.push({ key: "error", value: message, color: colors.red })
      if (typeof value.why === "string" && value.why.length > 0) {
        detailLines.push({ key: "why", value: value.why, color: colors.yellow })
      }
      if (typeof value.fix === "string" && value.fix.length > 0) {
        detailLines.push({ key: "fix", value: value.fix, color: colors.green })
      }
      if (typeof value.link === "string" && value.link.length > 0) {
        detailLines.push({ key: "link", value: value.link, color: colors.cyan })
      }
      if (
        detailLines.length > 0 &&
        detailLines[detailLines.length - 1]?.key !== "stack" &&
        typeof value.stack === "string" &&
        value.stack.length > 0
      ) {
        detailLines.push({ key: "stack", value: value.stack, color: colors.gray })
      }
      continue
    }

    detailLines.push({ key, value: formatValue(value) })
  }

  for (const [index, line] of detailLines.entries()) {
    const marker = index === detailLines.length - 1 ? "+-" : "|-"
    const keyColor = line.color ?? colors.white
    console.log(
      `  ${colors.dim}${marker}${colors.reset} ${keyColor}${line.key}:${colors.reset} ${line.value}`
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
      const serialized = safeJsonStringify(obj)
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
    const errWithData = err as Error & {
      data?: unknown
      why?: unknown
      fix?: unknown
      link?: unknown
    }
    const data = isPlainObject(errWithData.data) ? errWithData.data : undefined
    const why =
      typeof errWithData.why === "string"
        ? errWithData.why
        : typeof data?.why === "string"
          ? data.why
          : undefined
    const fix =
      typeof errWithData.fix === "string"
        ? errWithData.fix
        : typeof data?.fix === "string"
          ? data.fix
          : undefined
    const link =
      typeof errWithData.link === "string"
        ? errWithData.link
        : typeof data?.link === "string"
          ? data.link
          : undefined

    return {
      type: err.name,
      message: err.message,
      ...(includeStack ? { stack: err.stack } : {}),
      ...(why ? { why } : {}),
      ...(fix ? { fix } : {}),
      ...(link ? { link } : {}),
      ...(err.cause !== undefined ? { cause: err.cause } : {}),
    }
  }

  if (typeof err === "string") {
    return { message: err }
  }

  if (isPlainObject(err)) {
    const message = typeof err.message === "string" ? err.message : undefined
    const type = typeof err.name === "string" ? err.name : undefined
    const data = isPlainObject(err.data) ? err.data : undefined
    const why =
      typeof err.why === "string" ? err.why : typeof data?.why === "string" ? data.why : undefined
    const fix =
      typeof err.fix === "string" ? err.fix : typeof data?.fix === "string" ? data.fix : undefined
    const link =
      typeof err.link === "string"
        ? err.link
        : typeof data?.link === "string"
          ? data.link
          : undefined
    return {
      ...(type ? { type } : {}),
      ...(message ? { message } : {}),
      ...(why ? { why } : {}),
      ...(fix ? { fix } : {}),
      ...(link ? { link } : {}),
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
  if (event.error) return "error"
  if (typeof event.status_code === "number") {
    if (event.status_code >= 500) return "error"
    if (event.status_code >= 400) return "warn"
  }
  if (event.outcome === "error") return "error"
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

function normalizeHeaderAllowlist(allowlist: string[] | undefined): Set<string> | undefined {
  if (!allowlist || allowlist.length === 0) return undefined
  return new Set(allowlist.map((key) => key.toLowerCase()))
}

function headersToSafeRecord(
  headers: Headers,
  headerAllowlist?: Set<string>
): Record<string, string> {
  const out: Record<string, string> = {}
  headers.forEach((value, key) => {
    const normalizedKey = key.toLowerCase()
    if (SENSITIVE_HEADERS.has(normalizedKey)) return
    if (headerAllowlist && !headerAllowlist.has(normalizedKey)) return
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
  const urlMode = options.url ?? "sanitized"

  const storage = contextStorage()
  const includeErrorStack =
    options.includeErrorStack ??
    (typeof process !== "undefined" && process.env.NODE_ENV !== "production")
  const requestIdHeader = options.requestIdHeader ?? "x-request-id"
  const interactionIdHeader = options.interactionIdHeader ?? "x-interaction-id"
  const setResponseRequestIdHeader = options.setResponseRequestIdHeader ?? "x-request-id"
  const logger = options.logger ?? createDefaultLogger({ pretty, stringify })
  const headerAllowlist = normalizeHeaderAllowlist(options.headerAllowlist)

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

      const url =
        urlMode === "none"
          ? undefined
          : urlMode === "full"
            ? c.req.url
            : sanitizeUrlForLogging(c.req.url, {
                ...(options.redactQueryParams
                  ? { redactQueryParams: options.redactQueryParams }
                  : {}),
                ...(options.dropQueryParams ? { dropQueryParams: options.dropQueryParams } : {}),
              })

      const event: WideEvent = {
        timestamp: new Date(startMs).toISOString(),
        request_id: requestId,
        ...(interactionId ? { interaction_id: interactionId } : {}),
        method: c.req.method,
        path: c.req.path,
        ...(url ? { url } : {}),
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
          try {
            await options.keep(tailContext)
          } catch (err) {
            console.error("[@honostar/logging] keep hook failed", err)
          }
        }

        const forceKeep = tailContext.shouldKeep === true
        if (!forceKeep && !shouldSampleEvent(level, options.sampling?.rates)) {
          return
        }

        try {
          if (level === "error") {
            logger.error(event)
          } else {
            logger.info(event)
          }
        } catch (err) {
          console.error("[@honostar/logging] logger failed", err)
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
            headers: headersToSafeRecord(c.req.raw.headers, headerAllowlist),
          }

          Promise.resolve()
            .then(() => options.drain?.(drainContext))
            .catch((err) => {
              console.error("[@honostar/logging] drain failed", err)
            })
        }
      }
    })
  }
}
