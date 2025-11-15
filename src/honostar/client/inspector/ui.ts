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
        <tr style="border-bottom: 1px solid #333;" onmouseover="this.style.background='rgba(255, 255, 255, 0.05)'" onmouseout="this.style.background='transparent'">
          <td style="padding: 8px 12px; font-family: monospace; font-size: 13px; color: #3b82f6;">${key}</td>
          <td style="padding: 8px 12px; font-family: monospace; font-size: 13px; color: #fafafa;">${valueStr}</td>
        </tr>
      `
    })
    .join('')

  return `
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <thead>
        <tr style="border-bottom: 1px solid #333; background: rgba(255, 255, 255, 0.05);">
          <th style="padding: 8px 12px; text-align: left; font-weight: 600;">Signal</th>
          <th style="padding: 8px 12px; text-align: left; font-weight: 600;">Value</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="2" style="padding: 16px 12px; text-align: center; color: #a1a1aa;">No signals</td></tr>'}
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
      ? `<pre style="font-family: monospace; font-size: 12px; overflow: auto; margin: 0; white-space: pre-wrap;">${formatJSON(signals)}</pre>`
      : formatTable(signals)

  return `
    <div style="padding: 16px; display: flex; flex-direction: column; height: 100%;">
      <div style="display: flex; gap: 8px; margin-bottom: 12px;">
        <input
          type="text"
          id="inspector-filter-include"
          placeholder="Include regex (e.g., user)"
          style="
            flex: 1;
            padding: 6px 12px;
            font-size: 14px;
            border-radius: 6px;
            border: 1px solid #333;
            background: #1a1a1a;
            color: #fafafa;
          "
        />
        <input
          type="text"
          id="inspector-filter-exclude"
          placeholder="Exclude regex (e.g., temp$)"
          style="
            flex: 1;
            padding: 6px 12px;
            font-size: 14px;
            border-radius: 6px;
            border: 1px solid #333;
            background: #1a1a1a;
            color: #fafafa;
          "
        />
      </div>
      <div style="flex: 1; overflow: auto; border-radius: 6px; border: 1px solid #333;">
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
        <div style="padding: 12px 16px; border-bottom: 1px solid #333; font-size: 14px;" onmouseover="this.style.background='rgba(255, 255, 255, 0.05)'" onmouseout="this.style.background='transparent'">
          <div style="display: flex; align-items: center; gap: 8px; color: #a1a1aa; margin-bottom: 8px;">
            <span>${time}</span>
            <span style="padding: 2px 8px; border-radius: 9999px; background: rgba(59, 130, 246, 0.1); color: #3b82f6; font-size: 11px;">${e.source}</span>
          </div>
          <pre style="font-family: monospace; font-size: 12px; overflow: auto; margin: 0; white-space: pre-wrap;">${formatJSON(e.data)}</pre>
        </div>
      `
    })
    .join('')

  return `
    <div style="display: flex; flex-direction: column; height: 100%;">
      <div style="flex: 1; overflow: auto;">
        ${items || '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #a1a1aa; font-size: 14px;">No signal patches recorded</div>'}
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
        <div style="padding: 12px 16px; border-bottom: 1px solid #333; font-size: 14px;" onmouseover="this.style.background='rgba(255, 255, 255, 0.05)'" onmouseout="this.style.background='transparent'">
          <div style="color: #a1a1aa; margin-bottom: 8px;">${time}</div>
          <pre style="font-family: monospace; font-size: 12px; overflow: auto; margin: 0; white-space: pre-wrap;">${formatJSON(e.data)}</pre>
        </div>
      `
    })
    .join('')

  return `
    <div style="display: flex; flex-direction: column; height: 100%;">
      <div style="flex: 1; overflow: auto;">
        ${items || '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #a1a1aa; font-size: 14px;">No SSE events recorded</div>'}
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
      ? `<pre style="font-family: monospace; font-size: 12px; overflow: auto; margin: 0; white-space: pre-wrap;">${formatJSON(persisted)}</pre>`
      : formatTable(persisted)

  return `
    <div style="padding: 16px; display: flex; flex-direction: column; height: 100%;">
      <div style="display: flex; gap: 8px; margin-bottom: 12px;">
        <button
          id="inspector-storage-local"
          style="
            padding: 6px 12px;
            font-size: 14px;
            border-radius: 6px;
            border: 1px solid ${state.storageType === 'localStorage' ? '#3b82f6' : '#333'};
            background: ${state.storageType === 'localStorage' ? '#3b82f6' : 'transparent'};
            color: ${state.storageType === 'localStorage' ? '#ffffff' : '#fafafa'};
            cursor: pointer;
            transition: all 0.2s;
          "
          onmouseover="this.style.background='${state.storageType === 'localStorage' ? '#3b82f6' : 'rgba(255, 255, 255, 0.05)'}'"
          onmouseout="this.style.background='${state.storageType === 'localStorage' ? '#3b82f6' : 'transparent'}'"
        >
          localStorage
        </button>
        <button
          id="inspector-storage-session"
          style="
            padding: 6px 12px;
            font-size: 14px;
            border-radius: 6px;
            border: 1px solid ${state.storageType === 'sessionStorage' ? '#3b82f6' : '#333'};
            background: ${state.storageType === 'sessionStorage' ? '#3b82f6' : 'transparent'};
            color: ${state.storageType === 'sessionStorage' ? '#ffffff' : '#fafafa'};
            cursor: pointer;
            transition: all 0.2s;
          "
          onmouseover="this.style.background='${state.storageType === 'sessionStorage' ? '#3b82f6' : 'rgba(255, 255, 255, 0.05)'}'"
          onmouseout="this.style.background='${state.storageType === 'sessionStorage' ? '#3b82f6' : 'transparent'}'"
        >
          sessionStorage
        </button>
        <button
          id="inspector-storage-clear"
          style="
            padding: 6px 12px;
            font-size: 14px;
            border-radius: 6px;
            border: 1px solid #dc2626;
            background: transparent;
            color: #dc2626;
            cursor: pointer;
            transition: all 0.2s;
            margin-left: auto;
          "
          onmouseover="this.style.background='#dc2626'; this.style.color='#ffffff'"
          onmouseout="this.style.background='transparent'; this.style.color='#dc2626'"
        >
          Clear
        </button>
      </div>
      <div style="flex: 1; overflow: auto; border-radius: 6px; border: 1px solid #333;">
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
      style="
        padding: 6px 12px;
        font-size: 13px;
        font-weight: 500;
        border-radius: 4px;
        border: none;
        background: ${isActive ? 'rgba(255, 255, 255, 0.15)' : 'transparent'};
        color: ${isActive ? '#ffffff' : '#a1a1aa'};
        cursor: pointer;
        transition: all 0.2s;
      "
      onmouseover="this.style.background='${isActive ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)'}'; this.style.color='${isActive ? '#ffffff' : '#fafafa'}'"
      onmouseout="this.style.background='${isActive ? 'rgba(255, 255, 255, 0.15)' : 'transparent'}'; this.style.color='${isActive ? '#ffffff' : '#a1a1aa'}'"
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
      style="
        padding: 4px 6px;
        font-size: 11px;
        border-radius: 3px;
        border: 1px solid ${isActive ? 'transparent' : '#333'};
        background: ${isActive ? '#3b82f6' : 'transparent'};
        color: ${isActive ? '#ffffff' : '#fafafa'};
        cursor: pointer;
        transition: all 0.2s;
      "
      onmouseover="this.style.background='${isActive ? '#3b82f6' : 'rgba(255, 255, 255, 0.05)'}'"
      onmouseout="this.style.background='${isActive ? '#3b82f6' : 'transparent'}'"
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
      style="
        padding: 6px;
        border-radius: 4px;
        border: none;
        background: ${isActive ? '#3b82f6' : 'transparent'};
        color: ${isActive ? '#ffffff' : '#fafafa'};
        cursor: pointer;
        transition: all 0.2s;
        font-size: 12px;
      "
      onmouseover="this.style.background='${isActive ? '#3b82f6' : 'rgba(255, 255, 255, 0.05)'}'"
      onmouseout="this.style.background='${isActive ? '#3b82f6' : 'transparent'}'"
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
        background: #0a0a0a;
        color: #fafafa;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        font-size: 14px;
        line-height: 1.5;
      "
    >
      <div
        style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 16px;
          border-bottom: 1px solid #333;
          background: rgba(255, 255, 255, 0.05);
          flex-shrink: 0;
        "
      >
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
              <path d="M2 17l10 5 10-5"></path>
              <path d="M2 12l10 5 10-5"></path>
            </svg>
            <span style="font-weight: 600; font-size: 14px;">Honostar Devtools</span>
          </div>
          <div style="display: flex; gap: 4px; background: rgba(255, 255, 255, 0.1); border-radius: 6px; padding: 2px;">
            ${tabButton('signals', 'Signals', state.currentTab)}
            ${tabButton('patches', 'Patches', state.currentTab)}
            ${tabButton('sse', 'SSE', state.currentTab)}
            ${tabButton('persisted', 'Persisted', state.currentTab)}
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          ${
            state.currentTab === 'signals' || state.currentTab === 'persisted'
              ? `
            <div style="display: flex; gap: 4px;">
              ${viewModeButton('json', 'JSON', state.viewMode)}
              ${viewModeButton('table', 'Table', state.viewMode)}
            </div>
            <div style="width: 1px; height: 16px; background: #333;"></div>
            `
              : ''
          }
          <div style="display: flex; gap: 2px;">
            ${positionButton('left', '⬅', state.position)}
            ${positionButton('bottom', '⬇', state.position)}
            ${positionButton('right', '➡', state.position)}
            ${positionButton('top', '⬆', state.position)}
          </div>
          <div style="width: 1px; height: 16px; background: #333;"></div>
          <button
            id="inspector-clear"
            style="
              padding: 4px 8px;
              font-size: 12px;
              border-radius: 4px;
              border: none;
              background: transparent;
              color: #fafafa;
              cursor: pointer;
              transition: background-color 0.2s;
            "
            onmouseover="this.style.background='rgba(255, 255, 255, 0.1)'"
            onmouseout="this.style.background='transparent'"
            title="Clear Events"
          >
            Clear
          </button>
          <button
            id="inspector-close"
            style="
              padding: 4px;
              border-radius: 4px;
              border: none;
              background: transparent;
              color: #fafafa;
              cursor: pointer;
              transition: all 0.2s;
            "
            onmouseover="this.style.background='#dc2626'; this.style.color='#ffffff'"
            onmouseout="this.style.background='transparent'; this.style.color='#fafafa'"
            title="Close"
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
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 9999px;
      padding: 12px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 8px;
    "
    id="inspector-toggle-btn"
    title="Toggle Devtools"
    onmouseover="this.style.background='#1a1a1a'; this.style.borderColor='#555'"
    onmouseout="this.style.background='#0a0a0a'; this.style.borderColor='#333'"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
        <path d="M2 17l10 5 10-5"></path>
        <path d="M2 12l10 5 10-5"></path>
      </svg>

    </div>
  `
}
