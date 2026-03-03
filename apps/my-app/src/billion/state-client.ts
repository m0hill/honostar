import {
  STATE_OBJECT_NAME,
  isPlainRecord,
  type ToggleResult,
  type ViewportSnapshot,
  type ViewportUpdateResult,
} from "./domain"

type ContextWithState = {
  env: unknown
  var: {
    clientId?: string
  }
}

type DurableObjectStubLike = {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
}

type DurableObjectNamespaceLike = {
  getByName: (name: string) => DurableObjectStubLike
}

function isDurableObjectNamespaceLike(value: unknown): value is DurableObjectNamespaceLike {
  return isPlainRecord(value) && typeof value.getByName === "function"
}

function getStateNamespace(env: unknown): DurableObjectNamespaceLike {
  if (!isPlainRecord(env)) {
    throw new Error("[state-do] Missing env bindings")
  }

  const namespace = env.BILLION_CHECKBOXES_STATE
  if (!isDurableObjectNamespaceLike(namespace)) {
    throw new Error("[state-do] Missing BILLION_CHECKBOXES_STATE binding")
  }

  return namespace
}

function parseNumberField(value: unknown, key: string): number {
  if (!isPlainRecord(value)) {
    throw new Error(`[state-do] Invalid ${key} container`)
  }

  const field = value[key]
  if (typeof field !== "number" || !Number.isFinite(field)) {
    throw new Error(`[state-do] Invalid ${key}`)
  }

  return field
}

function parseNumberArrayField(value: unknown, key: string): number[] {
  if (!isPlainRecord(value)) {
    throw new Error(`[state-do] Invalid ${key} container`)
  }

  const field = value[key]
  if (!Array.isArray(field)) {
    throw new Error(`[state-do] Invalid ${key}`)
  }

  const out: number[] = []
  for (const item of field) {
    if (typeof item !== "number" || !Number.isFinite(item)) {
      throw new Error(`[state-do] Invalid ${key} entry`)
    }
    out.push(item)
  }

  return out
}

function parseViewportSnapshot(value: unknown): ViewportSnapshot {
  return {
    x: parseNumberField(value, "x"),
    y: parseNumberField(value, "y"),
    rows: parseNumberField(value, "rows"),
    cols: parseNumberField(value, "cols"),
    checkedCount: parseNumberField(value, "checkedCount"),
    checkedLocal: parseNumberArrayField(value, "checkedLocal"),
  }
}

function parseToggleResult(value: unknown): ToggleResult {
  if (!isPlainRecord(value)) {
    throw new Error("[state-do] Invalid toggle result")
  }

  const checked = value.checked
  if (typeof checked !== "boolean") {
    throw new Error("[state-do] Invalid checked flag")
  }

  return {
    row: parseNumberField(value, "row"),
    col: parseNumberField(value, "col"),
    checked,
    checkedCount: parseNumberField(value, "checkedCount"),
  }
}

function parseViewportUpdateResult(value: unknown): ViewportUpdateResult {
  if (!isPlainRecord(value) || typeof value.changed !== "boolean") {
    throw new Error("[state-do] Invalid viewport update")
  }

  return {
    changed: value.changed,
    snapshot: parseViewportSnapshot(value.snapshot),
  }
}

export function getWaitUntil(c: unknown): ((promise: Promise<unknown>) => void) | undefined {
  if (!isPlainRecord(c)) return undefined

  const executionCtx = c.executionCtx
  if (!isPlainRecord(executionCtx)) return undefined

  const waitUntil = executionCtx.waitUntil
  if (typeof waitUntil !== "function") return undefined

  return (promise: Promise<unknown>) => {
    try {
      waitUntil.call(executionCtx, promise)
    } catch (err) {
      console.error("[my-app] executionCtx.waitUntil failed", err)
    }
  }
}

async function callStateDo(c: ContextWithState, path: string, body?: unknown): Promise<unknown> {
  const namespace = getStateNamespace(c.env)
  const stub = namespace.getByName(STATE_OBJECT_NAME)

  const res = await stub.fetch(`https://state${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`[state-do] ${path} failed: ${res.status} ${text}`)
  }

  return await res.json()
}

async function loadViewport(
  c: ContextWithState,
  x: number,
  y: number,
  rows: number,
  cols: number
): Promise<ViewportSnapshot> {
  const data = await callStateDo(c, "/viewport", { x, y, rows, cols })
  return parseViewportSnapshot(data)
}

async function loadViewportForClient(
  c: ContextWithState,
  clientId: string,
  fallbackX: number,
  fallbackY: number,
  fallbackRows: number,
  fallbackCols: number
): Promise<ViewportSnapshot> {
  const data = await callStateDo(c, "/viewport-for-client", {
    clientId,
    fallbackX,
    fallbackY,
    fallbackRows,
    fallbackCols,
  })
  return parseViewportSnapshot(data)
}

export async function setViewportForClient(
  c: ContextWithState,
  clientId: string,
  x: number,
  y: number,
  rows: number,
  cols: number
): Promise<ViewportUpdateResult> {
  const data = await callStateDo(c, "/set-viewport", {
    clientId,
    x,
    y,
    rows,
    cols,
  })
  return parseViewportUpdateResult(data)
}

export async function toggleCell(
  c: ContextWithState,
  row: number,
  col: number
): Promise<ToggleResult> {
  const data = await callStateDo(c, "/toggle", { row, col })
  return parseToggleResult(data)
}

export async function resolveViewportForRequest(
  c: ContextWithState,
  fallbackX: number,
  fallbackY: number,
  fallbackRows: number,
  fallbackCols: number
): Promise<ViewportSnapshot> {
  const clientId = c.var.clientId
  if (clientId && clientId !== "anonymous") {
    return await loadViewportForClient(
      c,
      clientId,
      fallbackX,
      fallbackY,
      fallbackRows,
      fallbackCols
    )
  }

  return await loadViewport(c, fallbackX, fallbackY, fallbackRows, fallbackCols)
}
