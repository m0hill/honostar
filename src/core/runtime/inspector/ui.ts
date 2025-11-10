/**
 * UI rendering functions for the inspector
 */

import { getDatastarSignals, getPersistedSignals } from './state'
import type {
  InspectorEvent,
  InspectorPosition,
  InspectorState,
  InspectorTab,
  InspectorViewMode,
} from './types'

/**
 * Format data as JSON string
 */
function formatJSON(obj: unknown): string {
  return JSON.stringify(obj, null, 2)
}

/**
 * Format data as HTML table
 */
function formatTable(obj: Record<string, unknown>): string {
  const rows = Object.entries(obj)
    .map(([key, value]) => {
      const valueStr = typeof value === 'string' ? value : JSON.stringify(value)
      return `
        <tr class="border-b border-border hover:bg-muted/50">
          <td class="px-3 py-2 font-mono text-sm text-primary">${key}</td>
          <td class="px-3 py-2 font-mono text-sm">${valueStr}</td>
        </tr>
      `
    })
    .join('')

  return `
    <table class="w-full border-collapse text-sm">
      <thead>
        <tr class="border-b border-border bg-muted/50">
          <th class="px-3 py-2 text-left font-semibold">Signal</th>
          <th class="px-3 py-2 text-left font-semibold">Value</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="2" class="px-3 py-4 text-center text-muted-foreground">No signals</td></tr>'}
      </tbody>
    </table>
  `
}

/**
 * Get filtered signals based on state filters
 */
function getFilteredSignals(state: InspectorState): Record<string, unknown> {
  const signals = getDatastarSignals()
  const { include, exclude } = state.filter

  if (!include && !exclude) return signals

  const filtered: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(signals)) {
    if (include && !include.test(key)) continue
    if (exclude && exclude.test(key)) continue
    filtered[key] = value
  }
  return filtered
}

/**
 * Render the Signals tab
 */
function renderSignalsTab(state: InspectorState): string {
  const signals = getFilteredSignals(state)
  const content =
    state.viewMode === 'json'
      ? `<pre class="font-mono text-xs overflow-auto">${formatJSON(signals)}</pre>`
      : formatTable(signals)

  return `
    <div class="p-4 flex flex-col h-full">
      <div class="flex gap-2 mb-3">
        <input
          type="text"
          id="inspector-filter-include"
          placeholder="Include regex (e.g., user)"
          class="flex-1 px-3 py-1.5 text-sm rounded-md border border-input bg-background"
        />
        <input
          type="text"
          id="inspector-filter-exclude"
          placeholder="Exclude regex (e.g., temp$)"
          class="flex-1 px-3 py-1.5 text-sm rounded-md border border-input bg-background"
        />
      </div>
      <div class="flex-1 overflow-auto rounded-md border border-border">
        ${content}
      </div>
    </div>
  `
}

/**
 * Render the Patches tab
 */
function renderPatchesTab(events: InspectorEvent[]): string {
  const patchEvents = events.filter(e => e.type === 'signal-patch')
  const items = patchEvents
    .map(e => {
      const time = new Date(e.timestamp).toLocaleTimeString()
      return `
        <div class="px-4 py-3 border-b border-border text-sm hover:bg-muted/50">
          <div class="flex items-center gap-2 text-muted-foreground mb-2">
            <span>${time}</span>
            <span class="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">${e.source}</span>
          </div>
          <pre class="font-mono text-xs overflow-auto">${formatJSON(e.data)}</pre>
        </div>
      `
    })
    .join('')

  return `
    <div class="flex flex-col h-full">
      <div class="flex-1 overflow-auto">
        ${items || '<div class="flex items-center justify-center h-full text-muted-foreground text-sm">No signal patches recorded</div>'}
      </div>
    </div>
  `
}

/**
 * Render the SSE tab
 */
function renderSSETab(events: InspectorEvent[]): string {
  const sseEvents = events.filter(e => e.type === 'sse')
  const items = sseEvents
    .map(e => {
      const time = new Date(e.timestamp).toLocaleTimeString()
      return `
        <div class="px-4 py-3 border-b border-border text-sm hover:bg-muted/50">
          <div class="text-muted-foreground mb-2">${time}</div>
          <pre class="font-mono text-xs overflow-auto">${formatJSON(e.data)}</pre>
        </div>
      `
    })
    .join('')

  return `
    <div class="flex flex-col h-full">
      <div class="flex-1 overflow-auto">
        ${items || '<div class="flex items-center justify-center h-full text-muted-foreground text-sm">No SSE events recorded</div>'}
      </div>
    </div>
  `
}

/**
 * Render the Persisted tab
 */
function renderPersistedTab(state: InspectorState): string {
  const persisted = getPersistedSignals(state.storageType)
  const content =
    state.viewMode === 'json'
      ? `<pre class="font-mono text-xs overflow-auto">${formatJSON(persisted)}</pre>`
      : formatTable(persisted)

  return `
    <div class="p-4 flex flex-col h-full">
      <div class="flex gap-2 mb-3">
        <button
          id="inspector-storage-local"
          class="px-3 py-1.5 text-sm rounded-md border transition-colors ${
            state.storageType === 'localStorage'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background border-input hover:bg-muted'
          }"
        >
          localStorage
        </button>
        <button
          id="inspector-storage-session"
          class="px-3 py-1.5 text-sm rounded-md border transition-colors ${
            state.storageType === 'sessionStorage'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background border-input hover:bg-muted'
          }"
        >
          sessionStorage
        </button>
        <button
          id="inspector-storage-clear"
          class="px-3 py-1.5 text-sm rounded-md border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors ml-auto"
        >
          Clear
        </button>
      </div>
      <div class="flex-1 overflow-auto rounded-md border border-border">
        ${content}
      </div>
    </div>
  `
}

/**
 * Render the current tab based on state
 */
function renderCurrentTab(state: InspectorState): string {
  switch (state.currentTab) {
    case 'signals':
      return renderSignalsTab(state)
    case 'patches':
      return renderPatchesTab(state.events)
    case 'sse':
      return renderSSETab(state.events)
    case 'persisted':
      return renderPersistedTab(state)
    default:
      return ''
  }
}

/**
 * Create a tab button
 */
function tabButton(tab: InspectorTab, label: string, currentTab: InspectorTab): string {
  const isActive = currentTab === tab
  return `
    <button
      data-inspector-tab="${tab}"
      class="px-4 py-2 text-sm font-medium transition-colors rounded-md ${
        isActive
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
      }"
    >
      ${label}
    </button>
  `
}

/**
 * Create a view mode button
 */
function viewModeButton(
  mode: InspectorViewMode,
  label: string,
  currentMode: InspectorViewMode
): string {
  const isActive = currentMode === mode
  return `
    <button
      data-inspector-view="${mode}"
      class="px-2 py-1 text-xs rounded transition-colors ${
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'bg-background border border-input hover:bg-muted'
      }"
    >
      ${label}
    </button>
  `
}

/**
 * Create a position button
 */
function positionButton(
  pos: InspectorPosition,
  icon: string,
  currentPos: InspectorPosition
): string {
  const isActive = currentPos === pos
  return `
    <button
      data-inspector-position="${pos}"
      class="p-1.5 rounded transition-colors ${
        isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
      }"
      title="Position: ${pos}"
    >
      ${icon}
    </button>
  `
}

/**
 * Get position styles based on inspector position
 */
export function getPositionStyles(state: InspectorState): string {
  const isHorizontal = state.position === 'bottom' || state.position === 'top'
  const size = isHorizontal ? state.height : state.width

  const positions: Record<InspectorPosition, string> = {
    bottom: `
      bottom: 0;
      left: 0;
      right: 0;
      height: ${size}px;
      max-height: 80vh;
    `,
    top: `
      top: 0;
      left: 0;
      right: 0;
      height: ${size}px;
      max-height: 80vh;
    `,
    right: `
      top: 0;
      right: 0;
      bottom: 0;
      width: ${size}px;
      max-width: 80vw;
    `,
    left: `
      top: 0;
      left: 0;
      bottom: 0;
      width: ${size}px;
      max-width: 80vw;
    `,
  }

  return positions[state.position]
}

/**
 * Get resize handle styles based on inspector position
 */
function getResizeHandleStyles(position: InspectorPosition): string {
  const handles: Record<InspectorPosition, string> = {
    bottom: `
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      cursor: ns-resize;
    `,
    top: `
      bottom: 0;
      left: 0;
      right: 0;
      height: 4px;
      cursor: ns-resize;
    `,
    right: `
      top: 0;
      left: 0;
      bottom: 0;
      width: 4px;
      cursor: ew-resize;
    `,
    left: `
      top: 0;
      right: 0;
      bottom: 0;
      width: 4px;
      cursor: ew-resize;
    `,
  }

  return handles[position]
}

/**
 * Create the main overlay HTML
 */
export function createOverlayHTML(state: InspectorState): string {
  return `
    <div
      id="inspector-resize-handle"
      style="
        position: absolute;
        ${getResizeHandleStyles(state.position)}
        background: transparent;
        z-index: 10;
      "
    ></div>
    <div
      style="
        height: 100%;
        display: flex;
        flex-direction: column;
        background: #000;
        color: hsl(var(--foreground, 222.2 84% 4.9%));
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      "
    >
      <div
        class="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30"
        style="flex-shrink: 0;"
      >
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
              <path d="M2 17l10 5 10-5"></path>
              <path d="M2 12l10 5 10-5"></path>
            </svg>
            <span class="font-semibold text-sm">Datastar Inspector</span>
          </div>
          <div class="flex gap-1 bg-muted rounded-lg p-1">
            ${tabButton('signals', 'Signals', state.currentTab)}
            ${tabButton('patches', 'Patches', state.currentTab)}
            ${tabButton('sse', 'SSE', state.currentTab)}
            ${tabButton('persisted', 'Persisted', state.currentTab)}
          </div>
        </div>
        <div class="flex items-center gap-2">
          ${
            state.currentTab === 'signals' || state.currentTab === 'persisted'
              ? `
            <div class="flex gap-1">
              ${viewModeButton('json', 'JSON', state.viewMode)}
              ${viewModeButton('table', 'Table', state.viewMode)}
            </div>
            <div class="w-px h-4 bg-border"></div>
          `
              : ''
          }
          <div class="flex gap-0.5">
            ${positionButton('left', '⬅', state.position)}
            ${positionButton('bottom', '⬇', state.position)}
            ${positionButton('right', '➡', state.position)}
            ${positionButton('top', '⬆', state.position)}
          </div>
          <div class="w-px h-4 bg-border"></div>
          <button
            id="inspector-clear"
            class="px-2 py-1 text-xs rounded hover:bg-muted transition-colors"
            title="Clear Events"
          >
            Clear
          </button>
          <button
            id="inspector-close"
            class="p-1 rounded hover:bg-destructive hover:text-destructive-foreground transition-colors"
            title="Close (Ctrl+Shift+D)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>
      <div style="flex: 1; overflow: hidden;">
        ${renderCurrentTab(state)}
      </div>
    </div>
  `
}

/**
 * Create the toggle button HTML
 */
export function createToggleButton(): string {
  return `
    <div style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999998;
      background: #000;
      border: 1px solid hsl(var(--border, 214.3 31.8% 91.4%));
      border-radius: 9999px;
      padding: 12px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 8px;
    "
    id="inspector-toggle-btn"
    title="Toggle Inspector (Ctrl+Shift+D)"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
        <path d="M2 17l10 5 10-5"></path>
        <path d="M2 12l10 5 10-5"></path>
      </svg>
      <span style="font-size: 12px; font-weight: 500;">Datastar</span>
    </div>
  `
}
