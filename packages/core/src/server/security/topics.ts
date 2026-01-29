/**
 * SSE Topic Allowlist Security
 *
 * Prevents clients from subscribing to arbitrary SSE topics by enforcing
 * a server-authorized allowlist. Only topics signed by the server are
 * accepted by the SSE endpoint.
 *
 * Threat model:
 * - Without this protection, clients can guess topic names and subscribe to
 *   unauthorized data streams (e.g., topics encoding user IDs, org IDs)
 * - This causes cross-tenant data leakage
 *
 * Approach:
 * - Server signs the list of allowed topics and sets it in an HttpOnly cookie
 * - SSE endpoint verifies the signature and only subscribes to allowed topics
 * - HMAC-SHA256 based signatures provide stateless verification
 */

import type { Context } from "hono"
import { getCookie, setCookie } from "hono/cookie"
import type { HonostarConfig } from "../config"

const TOPICS_TOKEN_QUERY_PARAM = "topicsToken"
const TOPICS_TOKEN_HEADER = "X-Honostar-Topics"
const warned = new Set<string>()

function warnOnce(key: string, ...args: Parameters<typeof console.warn>) {
  if (warned.has(key)) return
  warned.add(key)
  console.warn(...args)
}

/**
 * Topic token payload structure (versioned for future compatibility)
 */
type TopicTokenPayload = {
  /** Protocol version (currently 1) */
  v: 1
  /** Sorted, deduplicated list of allowed topic names */
  topics: string[]
  /** Expiration time in Unix seconds */
  exp: number
  /** Client/tab ID when bindToClientId is enabled */
  clientId?: string
}

/**
 * Canonicalize a list of topics by sorting and deduplicating
 * Ensures consistent ordering for signature verification
 */
export function canonicalizeTopics(topics: string[]): string[] {
  return [...new Set(topics)].toSorted()
}

/**
 * Base64url encode (URL-safe, no padding)
 */
function base64urlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data))
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

/**
 * Base64url decode
 */
function base64urlDecode(str: string): Uint8Array {
  // Add padding back if needed
  const padded = str + "==".slice(0, (4 - (str.length % 4)) % 4)
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/")
  const binary = atob(base64)
  // Safe: binary is ASCII string from atob, each char is a single byte
  return new Uint8Array(Array.from(binary, (c) => c.charCodeAt(0)))
}

/**
 * HMAC-SHA256 signing
 */
async function hmacSign(secret: string, data: string): Promise<Uint8Array> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data))
  return new Uint8Array(signature)
}

/**
 * HMAC-SHA256 verification
 */
async function hmacVerify(secret: string, data: string, signature: Uint8Array): Promise<boolean> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  )
  // Create a new Uint8Array with ArrayBuffer (not SharedArrayBuffer) backing
  const sig = new Uint8Array(signature)
  return await crypto.subtle.verify("HMAC", key, sig, encoder.encode(data))
}

/**
 * Get signing secret from environment
 * Throws if secret is not configured in production
 */
function getSigningSecret(cfg: HonostarConfig): string | null {
  const secretEnv = cfg.security.topics?.secretEnv ?? "HONOSTAR_SIGNING_SECRET"
  const secret = process.env[secretEnv]

  if (!secret) {
    // In development, allow missing secret but warn
    if (process.env.NODE_ENV !== "production") {
      warnOnce(
        `topics:missing-secret:${secretEnv}`,
        `[Topic Security] No signing secret found in ${secretEnv}. ` +
          "Topic allowlist enforcement is DISABLED. " +
          "Set HONOSTAR_SIGNING_SECRET for production."
      )
      return null
    }
    throw new Error(
      `[Topic Security] Missing required environment variable: ${secretEnv}. ` +
        "Topic allowlist enforcement requires a signing secret in production."
    )
  }

  return secret
}

/**
 * Sign a list of allowed topics and set the cookie
 * Returns the signed token string
 *
 * @param c - Hono context
 * @param topics - List of topic names to allow
 * @param cfg - Honostar configuration
 * @returns Signed token (payload.signature format)
 */
export async function signTopics(
  c: Context,
  topics: string[],
  cfg: HonostarConfig
): Promise<string | null> {
  const secret = getSigningSecret(cfg)
  if (!secret) {
    // Development mode with no secret - skip signing
    return null
  }

  const topicsCfg = cfg.security.topics ?? {}
  const cookieName = topicsCfg.cookieName ?? "honostar_topics"
  const maxAgeSec = topicsCfg.maxAgeSec ?? 300
  const bindToClientId = topicsCfg.bindToClientId ?? false

  // Build payload
  const payload: TopicTokenPayload = {
    v: 1,
    topics: canonicalizeTopics(topics),
    exp: Math.floor(Date.now() / 1000) + maxAgeSec,
  }

  // Include clientId if binding is enabled
  if (bindToClientId) {
    const clientId = c.var.clientId
    if (!clientId || clientId === "anonymous") {
      console.warn("[Topic Security] Cannot bind to clientId - missing or anonymous")
    } else {
      payload.clientId = clientId
    }
  }

  // Serialize and sign
  const payloadJson = JSON.stringify(payload)
  const payloadBytes = new TextEncoder().encode(payloadJson)
  const payloadB64 = base64urlEncode(payloadBytes)

  const signature = await hmacSign(secret, payloadB64)
  const signatureB64 = base64urlEncode(signature)

  const token = `${payloadB64}.${signatureB64}`

  // Set HttpOnly cookie
  const url = new URL(c.req.url)
  const isSecure = url.protocol === "https:" || process.env.NODE_ENV === "production"

  setCookie(c, cookieName, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "Lax",
    path: cfg.endpoints.sse,
    maxAge: maxAgeSec,
  })

  return token
}

/**
 * Verify the signed topic token and return the intersection of requested topics
 * with the allowed topics from the token
 *
 * @param c - Hono context
 * @param requestedTopics - Topics the client wants to subscribe to
 * @param cfg - Honostar configuration
 * @returns Array of allowed topics, or null if verification fails
 */
export async function verifyTopics(
  c: Context,
  requestedTopics: string[],
  cfg: HonostarConfig
): Promise<string[] | null> {
  const secret = getSigningSecret(cfg)
  if (!secret) {
    // Development mode with no secret - allow all requested topics
    warnOnce(
      "topics:no-secret-allow-all",
      "[Topic Security] No secret configured - allowing all topics (development only)"
    )
    return requestedTopics
  }

  const topicsCfg = cfg.security.topics ?? {}
  const cookieName = topicsCfg.cookieName ?? "honostar_topics"
  const bindToClientId = topicsCfg.bindToClientId ?? false

  // Prefer a per-request token (query/header) to avoid multi-tab cookie clobbering.
  // Falls back to the signed cookie for backwards compatibility.
  const token =
    c.req.header(TOPICS_TOKEN_HEADER) ??
    c.req.query(TOPICS_TOKEN_QUERY_PARAM) ??
    getCookie(c, cookieName)
  if (!token) {
    console.warn("[Topic Security] No topic token found in request")
    return null
  }

  // Parse token (format: payload.signature)
  const parts = token.split(".")
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    console.warn("[Topic Security] Invalid token format")
    return null
  }

  const payloadB64 = parts[0]
  const signatureB64 = parts[1]

  // Verify signature
  try {
    const signature = base64urlDecode(signatureB64)
    const valid = await hmacVerify(secret, payloadB64, signature)
    if (!valid) {
      console.warn("[Topic Security] Invalid token signature")
      return null
    }
  } catch (err) {
    console.warn("[Topic Security] Signature verification failed:", err)
    return null
  }

  // Decode and validate payload
  let payload: TopicTokenPayload
  try {
    const payloadBytes = base64urlDecode(payloadB64)
    const payloadJson = new TextDecoder().decode(payloadBytes)
    payload = JSON.parse(payloadJson)
  } catch (err) {
    console.warn("[Topic Security] Failed to decode payload:", err)
    return null
  }

  // Validate payload structure
  if (
    !payload ||
    payload.v !== 1 ||
    !Array.isArray(payload.topics) ||
    typeof payload.exp !== "number"
  ) {
    console.warn("[Topic Security] Invalid payload structure")
    return null
  }

  // Check expiration
  const now = Math.floor(Date.now() / 1000)
  if (payload.exp < now) {
    console.warn("[Topic Security] Token expired")
    return null
  }

  // Verify clientId binding if enabled
  if (bindToClientId && payload.clientId) {
    const currentClientId = c.var.clientId
    if (payload.clientId !== currentClientId) {
      console.warn("[Topic Security] Token clientId mismatch")
      return null
    }
  }

  // Return intersection of requested and allowed topics
  const allowedSet = new Set(payload.topics)
  const intersection = requestedTopics.filter((topic) => allowedSet.has(topic))

  return intersection
}
