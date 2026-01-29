import type { Context, Env } from "hono"

export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

export type WideEventOutcome = "success" | "error"

export type WideEventError = {
  type?: string
  message?: string
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

export type WideEventEnricher<E extends Env = Env> = (
  c: Context<E>,
  evt: WideEvent
) => void | Promise<void>

export type HonostarLoggingOptions<E extends Env = Env> = {
  logger?: LoggerLike
  base?: Record<string, unknown> | ((c: Context<E>) => Record<string, unknown>)
  includeErrorStack?: boolean
  requestIdHeader?: string
  interactionIdHeader?: string
  setResponseRequestIdHeader?: string | false
  enrichers?: Array<WideEventEnricher<E>>
}

export type LogStore = {
  startMs: number
  event: WideEvent
  spans: WideEventSpan[]
}
