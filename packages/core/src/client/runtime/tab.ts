export function generateTabId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `tab-${Math.random().toString(36).slice(2)}`
}

export function ensureTabId(storageKey = "tabId"): string {
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
