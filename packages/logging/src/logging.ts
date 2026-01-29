import type { Context, Env, MiddlewareHandler } from "hono"
import { contextStorage, getContext } from "hono/context-storage"
import type {
  HonostarLoggingOptions,
  LogStore,
  LoggerLike,
  WideEvent,
  WideEventError,
  WideEventSpan,
} from "./types"

const StoreKey = "__honostarLog" as const

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

function defaultLogger(): LoggerLike {
  return {
    info(obj) {
      console.log(JSON.stringify(obj))
    },
    error(obj) {
      console.error(JSON.stringify(obj))
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

export const log = {
  add(fields: Record<string, unknown>): boolean {
    const store = getStoreFromContext()
    if (!store) return false
    if (!isPlainObject(fields)) return false
    deepMergeInto(store.event, fields)
    return true
  },

  span<T>(
    name: string,
    fn: () => T | Promise<T>,
    meta?: Record<string, unknown>
  ): Promise<T> {
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
  const storage = contextStorage()
  const includeErrorStack =
    options.includeErrorStack ??
    (typeof process !== "undefined" && process.env.NODE_ENV !== "production")
  const requestIdHeader = options.requestIdHeader ?? "x-request-id"
  const interactionIdHeader = options.interactionIdHeader ?? "x-interaction-id"
  const setResponseRequestIdHeader = options.setResponseRequestIdHeader ?? "x-request-id"

  return async (c, next) => {
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

        const logger = options.logger ?? defaultLogger()
        if (event.outcome === "error") {
          logger.error(event)
        } else {
          logger.info(event)
        }
      }
    })
  }
}
