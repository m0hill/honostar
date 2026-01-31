import type { SSEPayload } from "@honostar/core/server"

export type BusWireMessage =
  | { to: "client"; clientId: string; msg: SSEPayload }
  | { to: "topic"; topic: string; msg: SSEPayload }
  | { to: "all"; msg: SSEPayload }

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isSsePayload(value: unknown): value is SSEPayload {
  if (!isPlainRecord(value)) return false
  const event = value.event
  if (typeof event !== "string") return false
  switch (event) {
    case "datastar-patch-elements":
      return typeof value.html === "string" && isPlainRecord(value.options)
    case "datastar-patch-signals":
      return typeof value.signals === "string" && isPlainRecord(value.options)
    case "execute-script":
      return typeof value.script === "string"
    case "honostar-event":
      return typeof value.name === "string" && typeof value.payload === "string"
    case "datastar-honostar-stream-open":
      return (
        typeof value.streamId === "string" &&
        (value.meta === undefined || typeof value.meta === "string")
      )
    case "datastar-honostar-stream-chunk":
      return (
        typeof value.streamId === "string" &&
        (value.kind === "text" || value.kind === "json") &&
        typeof value.data === "string" &&
        (value.target === undefined || typeof value.target === "string")
      )
    case "datastar-honostar-stream-close":
      return typeof value.streamId === "string"
    case "datastar-honostar-stream-error":
      return typeof value.streamId === "string" && typeof value.message === "string"
    case "close":
      return true
    default:
      return false
  }
}

export function isBusWireMessage(value: unknown): value is BusWireMessage {
  if (!isPlainRecord(value)) return false
  const to = value.to
  if (to === "client") {
    return typeof value.clientId === "string" && isSsePayload(value.msg)
  }
  if (to === "topic") {
    return typeof value.topic === "string" && isSsePayload(value.msg)
  }
  if (to === "all") {
    return isSsePayload(value.msg)
  }
  return false
}
