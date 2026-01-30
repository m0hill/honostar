export function generateTabId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `tab-${Math.random().toString(36).slice(2)}`
}

export function ensureTabId(storageKey = "tabId"): string {
  // Prefer the server-bootstrapped tab id if present. This avoids any mismatch and ensures
  // the very first SSE connection (opened before runtime loads) uses the same id.
  if (typeof window !== "undefined" && typeof window.__honostarTabId === "string") {
    return window.__honostarTabId
  }

  try {
    let tabId = sessionStorage.getItem(storageKey)
    if (!tabId) {
      tabId = generateTabId()
      sessionStorage.setItem(storageKey, tabId)
    }
    return tabId
  } catch {
    return generateTabId()
  }
}
