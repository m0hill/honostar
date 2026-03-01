export type HonostarErrorData = {
  why?: string
  fix?: string
  link?: string
} & Record<string, unknown>

export type HonostarErrorInput = {
  message: string
  status?: number
  why?: string
  fix?: string
  link?: string
  data?: Record<string, unknown>
  cause?: unknown
}

export type HonostarStructuredError = Error & {
  status: number
  statusCode: number
  data?: HonostarErrorData
}

export type ParsedError = {
  message: string
  status: number
  why?: string
  fix?: string
  link?: string
  raw: unknown
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * Creates an Error object carrying machine-readable context fields.
 * Can be thrown and later mapped to an HTTP response by app-level error handlers.
 */
export function createError(input: HonostarErrorInput): HonostarStructuredError {
  const err = new Error(input.message) as HonostarStructuredError
  const status = Number.isFinite(input.status)
    ? Math.max(100, Math.min(599, input.status ?? 500))
    : 500
  err.name = "HonostarError"
  err.status = status
  err.statusCode = status
  if (input.cause !== undefined) {
    ;(err as Error & { cause?: unknown }).cause = input.cause
  }

  const mergedData: HonostarErrorData = {
    ...input.data,
    ...(input.why !== undefined ? { why: input.why } : {}),
    ...(input.fix !== undefined ? { fix: input.fix } : {}),
    ...(input.link !== undefined ? { link: input.link } : {}),
  }
  if (Object.keys(mergedData).length > 0) {
    err.data = mergedData
  }
  return err
}

/**
 * Parse unknown errors into a stable shape suitable for UI rendering.
 */
export function parseError(error: unknown): ParsedError {
  if (isPlainObject(error)) {
    const message =
      typeof error.message === "string" && error.message.length > 0
        ? error.message
        : "An error occurred"

    const statusCandidate = error.status ?? error.statusCode
    const status =
      typeof statusCandidate === "number" && Number.isFinite(statusCandidate)
        ? statusCandidate
        : 500

    const dataCandidate = error.data
    const data = isPlainObject(dataCandidate) ? dataCandidate : undefined

    return {
      message,
      status,
      ...(typeof data?.why === "string" ? { why: data.why } : {}),
      ...(typeof data?.fix === "string" ? { fix: data.fix } : {}),
      ...(typeof data?.link === "string" ? { link: data.link } : {}),
      raw: error,
    }
  }

  if (error instanceof Error) {
    return {
      message: error.message || "An error occurred",
      status: 500,
      raw: error,
    }
  }

  return {
    message: String(error),
    status: 500,
    raw: error,
  }
}
