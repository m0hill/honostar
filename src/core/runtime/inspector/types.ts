/**
 * Type definitions for the Datastar Inspector
 */

export type InspectorTab = 'signals' | 'patches' | 'sse' | 'persisted'
export type InspectorViewMode = 'json' | 'table'
export type InspectorStorageType = 'localStorage' | 'sessionStorage'
export type InspectorPosition = 'bottom' | 'right' | 'left' | 'top'

export type SignalFilter = {
  include?: RegExp
  exclude?: RegExp
}

export type InspectorEvent = {
  timestamp: number
  type: 'signal-patch' | 'sse' | 'signal-update'
  data: unknown
  source: 'frontend' | 'backend'
}

export type InspectorConfig = {
  enabled: boolean
  keyboardShortcut: string
  maxEvents: number
  defaultTab: InspectorTab
  defaultViewMode: InspectorViewMode
  defaultPosition: InspectorPosition
}

export type InspectorApi = {
  isOpen(): boolean
  open(): void
  close(): void
  toggle(): void
  setTab(tab: InspectorTab): void
  setViewMode(mode: InspectorViewMode): void
  setFilter(filter: SignalFilter): void
  clearEvents(): void
  getSignals(): Record<string, unknown>
  getEvents(): InspectorEvent[]
  destroy(): void
}

export type InspectorState = {
  isOpen: boolean
  currentTab: InspectorTab
  viewMode: InspectorViewMode
  filter: SignalFilter
  events: InspectorEvent[]
  storageType: InspectorStorageType
  position: InspectorPosition
  height: number
  width: number
}
