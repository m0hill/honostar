import { ensureHonostar, freeze } from "./global"

type StreamOpenEvent = { type: "open"; streamId: string; meta: unknown }
type StreamChunkEvent = {
  type: "chunk"
  streamId: string
  kind: "text" | "json"
  data: unknown
  target: unknown
}
type StreamCloseEvent = { type: "close"; streamId: string }
type StreamErrorEvent = { type: "error"; streamId: string; message: string }

export type HonostarStreamEvent =
  | StreamOpenEvent
  | StreamChunkEvent
  | StreamCloseEvent
  | StreamErrorEvent

export type HonostarStreamHandler = (event: HonostarStreamEvent) => void

type DatastarWatcherModule = {
  watcher: (def: {
    name: string
    apply: (ctx: unknown, args: Record<string, string>) => void
  }) => void
  mergePatch: (patch: Record<string, unknown>, opts?: { ifMissing?: boolean }) => void
  getPath: (path: string) => unknown
  beginBatch: () => void
  endBatch: () => void
}

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isDatastarWatcherModule = (value: unknown): value is DatastarWatcherModule => {
  if (!isPlainRecord(value)) return false
  return (
    typeof value["watcher"] === "function" &&
    typeof value["mergePatch"] === "function" &&
    typeof value["getPath"] === "function" &&
    typeof value["beginBatch"] === "function" &&
    typeof value["endBatch"] === "function"
  )
}

function safeJsonParse(value: string | undefined): unknown {
  if (!value || value.trim() === "") return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function applyTarget(
  ds: DatastarWatcherModule,
  target: unknown,
  kind: "text" | "json",
  data: unknown
) {
  if (!isPlainRecord(target)) return
  const t = target

  const mode = t.mode === "append" ? "append" : "replace"
  const signal = typeof t.signal === "string" && t.signal.length > 0 ? t.signal : null
  const selector = typeof t.selector === "string" && t.selector.length > 0 ? t.selector : null

  if (signal) {
    const nextValue =
      kind === "text"
        ? typeof data === "string"
          ? data
          : ""
        : data === null || data === undefined
          ? ""
          : typeof data === "string"
            ? data
            : JSON.stringify(data)

    ds.beginBatch()
    try {
      if (mode === "append") {
        const prev = ds.getPath(signal)
        const prevString = typeof prev === "string" ? prev : ""
        ds.mergePatch({ [signal]: `${prevString}${nextValue}` })
      } else {
        ds.mergePatch({ [signal]: nextValue })
      }
    } finally {
      ds.endBatch()
    }
  }

  if (selector) {
    const el = document.querySelector(selector)
    if (el) {
      const nextText =
        kind === "text"
          ? typeof data === "string"
            ? data
            : ""
          : data === null || data === undefined
            ? ""
            : typeof data === "string"
              ? data
              : JSON.stringify(data)

      if (mode === "append") {
        el.textContent = `${el.textContent ?? ""}${nextText}`
      } else {
        el.textContent = nextText
      }
    }
  }
}

function createStreamsApi() {
  const subs = new Map<string, Set<HonostarStreamHandler>>()

  const subscribe = (streamId: string, handler: HonostarStreamHandler) => {
    if (!streamId || typeof streamId !== "string") {
      throw new Error("[Honostar] streamId must be a non-empty string")
    }
    if (typeof handler !== "function") {
      throw new Error("[Honostar] stream handler must be a function")
    }
    let set = subs.get(streamId)
    if (!set) {
      set = new Set()
      subs.set(streamId, set)
    }
    set.add(handler)
    return () => {
      const current = subs.get(streamId)
      if (!current) return
      current.delete(handler)
      if (current.size === 0) subs.delete(streamId)
    }
  }

  const emit = (event: HonostarStreamEvent) => {
    const set = subs.get(event.streamId)
    if (!set || set.size === 0) return
    for (const handler of set) {
      try {
        handler(event)
      } catch (err) {
        console.error("[Honostar] stream handler error", err)
      }
    }
  }

  return freeze({ subscribe, _emit: emit })
}

let streamsApi: ReturnType<typeof createStreamsApi> | null = null

/**
 * Installs Datastar watchers for Honostar stream events on the main SSE connection.
 *
 * This is intentionally runtime-only: it does not require any server cooperation beyond
 * sending `datastar-honostar-stream-*` SSE events over `/_/events`.
 */
export async function installStreamRuntime(datastarEntrypoint?: string): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") return
  if (window.__honostarStreamsInstalled) return
  window.__honostarStreamsInstalled = true

  const honostar = ensureHonostar()
  streamsApi ??= createStreamsApi()
  if (!honostar.streams) {
    // Hide the internal emitter from end users.
    honostar.streams = freeze({ subscribe: streamsApi.subscribe })
  }

  const resolvedEntrypoint = datastarEntrypoint ?? "/datastar.js"
  const mod = await import(resolvedEntrypoint)
  if (!isDatastarWatcherModule(mod)) {
    console.error("[Honostar] Datastar module does not expose watcher/mergePatch/getPath")
    return
  }
  const ds = mod

  const emit = (event: HonostarStreamEvent) => {
    streamsApi?._emit(event)
  }

  ds.watcher({
    name: "datastar-honostar-stream-open",
    apply(_ctx, args) {
      const streamId = args.streamId ?? ""
      if (!streamId) return
      const meta = safeJsonParse(args.meta)
      emit({ type: "open", streamId, meta })
    },
  })

  ds.watcher({
    name: "datastar-honostar-stream-chunk",
    apply(_ctx, args) {
      const streamId = args.streamId ?? ""
      const kind = args.kind === "json" ? "json" : "text"
      if (!streamId) return

      const target = safeJsonParse(args.target)
      const raw = args.data ?? ""
      const data = kind === "json" ? safeJsonParse(raw) : raw

      if (target) {
        applyTarget(ds, target, kind, data)
      }

      emit({ type: "chunk", streamId, kind, data, target })
    },
  })

  ds.watcher({
    name: "datastar-honostar-stream-close",
    apply(_ctx, args) {
      const streamId = args.streamId ?? ""
      if (!streamId) return
      emit({ type: "close", streamId })
    },
  })

  ds.watcher({
    name: "datastar-honostar-stream-error",
    apply(_ctx, args) {
      const streamId = args.streamId ?? ""
      const message = args.message ?? "Unknown stream error"
      if (!streamId) return
      emit({ type: "error", streamId, message })
    },
  })
}
