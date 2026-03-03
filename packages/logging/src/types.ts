import type { Context, Env } from "hono"

export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

export type WideEventOutcome = "success" | "error"
export type WideEventLevel = "info" | "error" | "warn" | "debug"

export type WideEventError = {
  type?: string
  message?: string
  why?: string
  fix?: string
  link?: string
  stack?: string
  cause?: unknown
}

export type WideEventSpan = {
  name: string
  duration_ms: number
  meta?: Record<string, unknown>
  error?: WideEventError
}

export type WideEventBase = {
  timestamp: string
  level?: WideEventLevel
  request_id: string
  interaction_id?: string
  method: string
  path: string
  url?: string
  status_code?: number
  duration_ms?: number
  outcome?: WideEventOutcome
  error?: WideEventError
  spans?: WideEventSpan[]
}

export type WideEvent = WideEventBase & Record<string, unknown>

export type LoggerLike = {
  info: (obj: unknown, msg?: string) => void
  error: (obj: unknown, msg?: string) => void
}

export type SamplingRates = {
  info?: number
  warn?: number
  debug?: number
  error?: number
}

export type TailSamplingCondition = {
  status?: number
  durationMs?: number
  path?: string
}

export type TailSamplingContext = {
  status?: number
  durationMs: number
  path: string
  method: string
  event: WideEvent
  shouldKeep?: boolean
}

export type SamplingConfig = {
  rates?: SamplingRates
  keep?: TailSamplingCondition[]
}

export type DrainContext = {
  event: WideEvent
  request: {
    method: string
    path: string
    requestId: string
  }
  response: {
    status: number
    durationMs: number
  }
  headers: Record<string, string>
}

export type WideEventEnricher<E extends Env = Env> = (
  c: Context<E>,
  evt: WideEvent
) => void | Promise<void>

export type HonostarLoggingOptions<E extends Env = Env> = {
  enabled?: boolean
  pretty?: boolean
  stringify?: boolean
  logger?: LoggerLike
  base?: Record<string, unknown> | ((c: Context<E>) => Record<string, unknown>)
  includeErrorStack?: boolean
  requestIdHeader?: string
  interactionIdHeader?: string
  setResponseRequestIdHeader?: string | false
  include?: string[]
  exclude?: string[]
  /**
   * Controls how `event.url` is logged.
   * - `sanitized` (default): logs the URL with sensitive query params redacted.
   * - `full`: logs the raw URL (not recommended).
   * - `none`: omits `event.url` entirely (use `path` instead).
   */
  url?: "sanitized" | "full" | "none"
  /**
   * Query param keys to redact (value replaced with `[redacted]`) when `url: "sanitized"`.
   * Keys are matched case-insensitively.
   */
  redactQueryParams?: string[]
  /**
   * Query param keys to drop entirely when `url: "sanitized"`.
   * Keys are matched case-insensitively.
   */
  dropQueryParams?: string[]
  sampling?: SamplingConfig
  keep?: (ctx: TailSamplingContext) => void | Promise<void>
  headerAllowlist?: string[]
  drain?: (ctx: DrainContext) => void | Promise<void>
  enrichers?: Array<WideEventEnricher<E>>
}

export type LogStore = {
  startMs: number
  event: WideEvent
  spans: WideEventSpan[]
}
