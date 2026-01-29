/**
 * State management for the inspector
 */

import type { InspectorConfig, InspectorState } from "./types"

export const STORAGE_KEY = "honostar-inspector-state"

export function loadState(): Partial<InspectorState> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

export function saveState(state: InspectorState): void {
  try {
    const toSave = {
      isOpen: state.isOpen,
      currentTab: state.currentTab,
      viewMode: state.viewMode,
      position: state.position,
      height: state.height,
      width: state.width,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  } catch {
    // Ignore errors
  }
}

export function createInitialState(config: InspectorConfig): InspectorState {
  const savedState = loadState()

  return {
    isOpen: savedState.isOpen ?? false,
    currentTab: savedState.currentTab ?? config.defaultTab,
    viewMode: savedState.viewMode ?? config.defaultViewMode,
    filter: {},
    events: [],
    storageType: "localStorage",
    position: savedState.position ?? config.defaultPosition,
    height: savedState.height ?? 400,
    width: savedState.width ?? 600,
  }
}

/**
 * Get Datastar's current signals from the data-json-signals element
 */
export function getDatastarSignals(): Record<string, unknown> {
  try {
    const signalsEl = document.getElementById("ds-inspector-signals")
    if (!signalsEl) {
      console.warn("[Inspector] #ds-inspector-signals element not found")
      return {}
    }

    const content = signalsEl.textContent || "{}"
    return JSON.parse(content)
  } catch (err) {
    console.error("[Inspector] Failed to parse signals:", err)
    return {}
  }
}

/**
 * Get persisted signals from localStorage or sessionStorage
 */
export function getPersistedSignals(
  storageType: "localStorage" | "sessionStorage"
): Record<string, unknown> {
  try {
    const storage = storageType === "localStorage" ? localStorage : sessionStorage
    const storageKey = "datastar"
    const raw = storage.getItem(storageKey)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}
