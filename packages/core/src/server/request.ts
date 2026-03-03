import type { Context } from "hono"
import type { AppEnv } from "./context"

/**
 * Detect whether the incoming request originated from a Datastar action.
 *
 * Datastar sends the `datastar-request` header for enhanced form/link actions.
 * Use this helper (or `c.var.isDatastarRequest`) instead of manually checking headers.
 */
export function isDatastarRequest(c: Context<AppEnv>): boolean {
  const header = c.req.header("datastar-request")
  if (header === null || header === undefined) return false
  const normalized = header.trim().toLowerCase()
  if (normalized === "" || normalized === "false" || normalized === "0" || normalized === "no") {
    return false
  }
  return true
}
